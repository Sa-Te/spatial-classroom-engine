package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
)

type HealthResponse struct {
	Version string `json:"version"`
	Status  string `json:"status"`
}

func main() {
	// Set up routes
	http.HandleFunc("/api/v1/health/live", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := HealthResponse{
			Version: "0.1.0",
			Status:  "healthy",
		}
		json.NewEncoder(w).Encode(response)
	})

	http.HandleFunc("/api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		response := HealthResponse{
			Version: "0.1.0",
			Status:  "ready",
		}
		json.NewEncoder(w).Encode(response)
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	log.Printf("Starting server on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}