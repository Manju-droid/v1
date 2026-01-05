#!/bin/bash
API_URL="http://localhost:8080/api"

echo "Logging in..."
RESPONSE=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"tech_guru@test.com","password":"password123"}')

echo "Response: $RESPONSE"

TOKEN=$(echo $RESPONSE | jq -r .token)
echo "Extracted Token: $TOKEN"

echo "Checking /me..."
curl -v -X GET $API_URL/auth/me -H "Authorization: Bearer $TOKEN"
