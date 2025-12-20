package service

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a connected user
type Client struct {
	Hub    *Hub
	Conn   *websocket.Conn
	Send   chan []byte
	RoomID string
	UserID string
}

// MessageHandler is a function that processes specific message types
type MessageHandler func(msg map[string]interface{}, client *Client)

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
	// Registered clients by room
	rooms map[string]map[*Client]bool

	// Register requests from the clients
	Register chan *Client

	// Unregister requests from clients
	Unregister chan *Client

	// Broadcast messages to a room
	Broadcast chan Message

	// Message handlers for specific message types
	messageHandlers map[string]MessageHandler

	mu sync.RWMutex
}

type Message struct {
	RoomID  string
	Payload []byte
	Sender  *Client
}

func NewHub() *Hub {
	return &Hub{
		rooms:           make(map[string]map[*Client]bool),
		Register:        make(chan *Client),
		Unregister:      make(chan *Client),
		Broadcast:       make(chan Message, 100), // Buffered channel to prevent blocking
		messageHandlers: make(map[string]MessageHandler),
	}
}

// RegisterMessageHandler registers a handler for a specific message type
func (h *Hub) RegisterMessageHandler(msgType string, handler MessageHandler) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.messageHandlers[msgType] = handler
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.rooms[client.RoomID] == nil {
				h.rooms[client.RoomID] = make(map[*Client]bool)
			}
			h.rooms[client.RoomID][client] = true
			h.mu.Unlock()
			log.Printf("Client %s joined room %s", client.UserID, client.RoomID)

			// Notify others in room
			h.broadcastToRoom(client.RoomID, map[string]interface{}{
				"type":   "user-joined",
				"userId": client.UserID,
			}, client)

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[client.RoomID]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.Send)
					if len(clients) == 0 {
						delete(h.rooms, client.RoomID)
					}
				}
			}
			h.mu.Unlock()
			log.Printf("Client %s left room %s", client.UserID, client.RoomID)

			// Notify others
			h.broadcastToRoom(client.RoomID, map[string]interface{}{
				"type":   "user-left",
				"userId": client.UserID,
			}, client)

		case message := <-h.Broadcast:
			// Check if this message needs special handling before broadcasting
			var msgData map[string]interface{}
			if err := json.Unmarshal(message.Payload, &msgData); err == nil {
				msgType, _ := msgData["type"].(string)
				if handler, exists := h.messageHandlers[msgType]; exists && message.Sender != nil {
					// Handle the message (e.g., update database, process logic)
					handler(msgData, message.Sender)
					// Continue to broadcast the message to other clients
				}
			}

			h.mu.RLock()
			if clients, ok := h.rooms[message.RoomID]; ok {
				log.Printf("[Hub] Broadcasting to room %s, %d clients", message.RoomID, len(clients))
				for client := range clients {
					// Don't send back to sender (if sender is set)
					if message.Sender == nil || client != message.Sender {
						select {
						case client.Send <- message.Payload:
							log.Printf("[Hub] Sent message to client %s in room %s", client.UserID, message.RoomID)
						default:
							log.Printf("[Hub] Failed to send to client %s, closing connection", client.UserID)
							close(client.Send)
							delete(clients, client)
						}
					} else {
						log.Printf("[Hub] Skipping sender %s", client.UserID)
					}
				}
			} else {
				log.Printf("[Hub] No clients found for room %s", message.RoomID)
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) broadcastToRoom(roomID string, data interface{}, sender *Client) {
	payload, _ := json.Marshal(data)
	h.Broadcast <- Message{
		RoomID:  roomID,
		Payload: payload,
		Sender:  sender,
	}
}

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096 // Increased for SDP/ICE
)

func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Parse message and add senderId
		var msgData map[string]interface{}
		if err := json.Unmarshal(message, &msgData); err == nil {
			// Add senderId to the message
			msgData["senderId"] = c.UserID
			
			// Check if this is a debate room message that needs special handling
			msgType, _ := msgData["type"].(string)
			if msgType != "" && (msgType == "debate:join_room" || msgType == "debate:leave_room" || 
				msgType == "debate:self_mute_change" || msgType == "debate:mute_change") {
				// Store handler in client for debate-specific handling
				// We'll handle this in the websocket handler
				// For now, just add senderId and broadcast
			}
			
			// Re-marshal with senderId
			if newPayload, err := json.Marshal(msgData); err == nil {
				message = newPayload
			}
		}

		// Broadcast to room
		c.Hub.Broadcast <- Message{
			RoomID:  c.RoomID,
			Payload: message,
			Sender:  c,
		}
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
