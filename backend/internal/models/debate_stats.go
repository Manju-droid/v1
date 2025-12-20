package models

import "time"

type DebateTopicStats struct {
	Topic            string    `json:"topic"`
	TotalParticipants int      `json:"totalParticipants"`
	TotalAgree       int      `json:"totalAgree"`
	TotalDisagree    int      `json:"totalDisagree"`
	SessionsCount    int      `json:"sessionsCount"`
	LastUpdated      time.Time `json:"lastUpdated"`
}

