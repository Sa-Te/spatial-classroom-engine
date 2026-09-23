package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// DB holds the database connection
var DB *sql.DB

// Init initializes the database connection
func Init() error {
	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default to local development
		dbURL = "postgres://app_runtime:change-me@localhost:5432/spatial_classroom?sslmode=disable"
	}
	
	// Open database connection
	var err error
	DB, err = sql.Open("postgres", dbURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Set connection pool settings
	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(25)
	DB.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err = DB.PingContext(ctx); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	log.Println("Database connection established successfully")
	return nil
}

// Close closes the database connection
func Close() {
	if DB != nil {
		DB.Close()
	}
}

// Migrate runs the database migrations
func Migrate() error {
	// Create the app_metadata table
	createTableSQL := `
	CREATE TABLE IF NOT EXISTS app_metadata (
		id SERIAL PRIMARY KEY,
		key VARCHAR(255) UNIQUE NOT NULL,
		value TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`

	_, err := DB.Exec(createTableSQL)
	if err != nil {
		return fmt.Errorf("failed to create app_metadata table: %w", err)
	}

	// Insert initial version record
	_, err = DB.Exec(`
		INSERT INTO app_metadata (key, value) 
		VALUES ('version', '0.1.0')
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
	`)
	
	if err != nil {
		return fmt.Errorf("failed to insert version record: %w", err)
	}

	return nil
}

// TestConnection tests the database connection and returns true if successful
func TestConnection() error {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	
	return DB.PingContext(ctx)
}