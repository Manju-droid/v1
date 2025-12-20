package api

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/yourusername/v-backend/internal/service"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for now
	},
}

// ServeWs handles websocket requests from the peer.
func ServeWs(hub *service.Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	roomID := r.URL.Query().Get("roomId")
	userID := r.URL.Query().Get("userId")

	if roomID == "" || userID == "" {
		log.Println("Missing roomId or userId")
		conn.Close()
		return
	}

	client := &service.Client{
		Hub:    hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
		RoomID: roomID,
		UserID: userID,
	}

	client.Hub.Register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.WritePump()
	go client.ReadPump()
}
