.PHONY: run build clean

run:
	go run cmd/api/main.go

build:
	go build -o bin/api cmd/api/main.go

clean:
	rm -rf bin/

deps:
	go mod download
	go mod tidy

test:
	go test ./...

.DEFAULT_GOAL := run

