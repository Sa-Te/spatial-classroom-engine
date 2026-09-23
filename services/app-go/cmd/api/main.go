package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"app-go/internal/database"
)

type HealthResponse struct {
	Version string `json:"version"`
	Status  string `json:"status"`
}

func main() {
	// Initialize database
	if err := database.Init(); err != nil {
		log.Printf("Warning: Failed to initialize database: %v", err)
		// Don't fail completely, allow to run in mock mode
	}
	defer database.Close()

	// Handle migrate command
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := database.Migrate(); err != nil {
			log.Fatalf("Migration failed: %v", err)
		}
		fmt.Println("Migration completed successfully")
		return
	}

	// Set up routes with proper CORS headers
	http.HandleFunc("/api/v1/health/live", func(w http.ResponseWriter, r *http.Request) {
		// Add CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")
		
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		response := HealthResponse{
			Version: "0.1.0",
			Status:  "healthy",
		}
		json.NewEncoder(w).Encode(response)
	})

	http.HandleFunc("/api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		// Add CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Content-Type", "application/json")
		
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		// Check database readiness if database is initialized
		if database.DB != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			
			if err := database.DB.PingContext(ctx); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				response := HealthResponse{
					Version: "0.1.0",
					Status:  "unready",
				}
				json.NewEncoder(w).Encode(response)
				return
			}
		}
		
		response := HealthResponse{
			Version: "0.1.0",
			Status:  "ready",
		}
		json.NewEncoder(w).Encode(response)
	})

	// Start server
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8081"  // Default port
	}
	
	addr := ":" + port
	server := &http.Server{
		Addr: addr,
	}

	// Create channel for shutdown signals
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGINT, syscall.SIGTERM)

	fmt.Printf("Starting server on port %s\n", port)
	
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("Server failed to start: %v\n", err)
			// Don't exit here, let the shutdown handle it
		}
	}()

	fmt.Println("Server started. Press Ctrl+C to stop.")
	
	// Wait for interrupt signal
	<-done
	fmt.Println("\nShutting down server...")
	
	// Create context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	// Gracefully shutdown the server
	if err := server.Shutdown(ctx); err != nil {
		fmt.Printf("Server shutdown error: %v\n", err)
	} else {
		fmt.Println("Server shutdown complete")
	}
}