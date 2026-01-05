#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"

# 1. Create Users
echo "Creating users..."
# Fixed: 'handle' instead of 'username'
curl -s -X POST $API_URL/auth/signup -H "Content-Type: application/json" -d '{"email":"tech_guru@test.com","password":"password123","name":"Tech Guru","handle":"tech_guru","dateOfBirth":"1990-01-01"}' > /dev/null
curl -s -X POST $API_URL/auth/signup -H "Content-Type: application/json" -d '{"email":"sporty_spice@test.com","password":"password123","name":"Sporty Spice","handle":"sporty_spice","dateOfBirth":"1995-05-05"}' > /dev/null
curl -s -X POST $API_URL/auth/signup -H "Content-Type: application/json" -d '{"email":"news_anchor@test.com","password":"password123","name":"News Anchor","handle":"news_anchor","dateOfBirth":"1985-08-08"}' > /dev/null

# Get User IDs (Login)
# Fixed: jq path .data.token
TOKEN_TECH=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"tech_guru@test.com","password":"password123"}' | jq -r .data.token)
ID_TECH=$(curl -s -X GET $API_URL/auth/me -H "Authorization: Bearer $TOKEN_TECH" | jq -r .data.id)

TOKEN_SPORT=$(curl -s -X POST $API_URL/auth/login -H "Content-Type: application/json" -d '{"email":"sporty_spice@test.com","password":"password123"}' | jq -r .data.token)
ID_SPORT=$(curl -s -X GET $API_URL/auth/me -H "Authorization: Bearer $TOKEN_SPORT" | jq -r .data.id)

echo "Tech ID: $ID_TECH"
echo "Sport ID: $ID_SPORT"

if [ "$ID_TECH" == "null" ] || [ -z "$ID_TECH" ]; then
  echo "Error: Failed to register/login Tech user"
  exit 1
fi

# 2. Create Hashtags in Categories
echo "Creating hashtags..."
# Fixed: Add 'createdBy'
curl -s -X POST $API_URL/hashtags -H "Authorization: Bearer $TOKEN_TECH" -H "Content-Type: application/json" \
  -d "{\"name\":\"AI\",\"slug\":\"ai\",\"category\":\"Technology\",\"createdBy\":\"$ID_TECH\"}" > /dev/null
curl -s -X POST $API_URL/hashtags -H "Authorization: Bearer $TOKEN_TECH" -H "Content-Type: application/json" \
  -d "{\"name\":\"Coding\",\"slug\":\"coding\",\"category\":\"Technology\",\"createdBy\":\"$ID_TECH\"}" > /dev/null

curl -s -X POST $API_URL/hashtags -H "Authorization: Bearer $TOKEN_SPORT" -H "Content-Type: application/json" \
  -d "{\"name\":\"Football\",\"slug\":\"football\",\"category\":\"Sports\",\"createdBy\":\"$ID_SPORT\"}" > /dev/null
curl -s -X POST $API_URL/hashtags -H "Authorization: Bearer $TOKEN_SPORT" -H "Content-Type: application/json" \
  -d "{\"name\":\"Olympics\",\"slug\":\"olympics\",\"category\":\"Sports\",\"createdBy\":\"$ID_SPORT\"}" > /dev/null

# 3. Create Posts (Volume to trigger Trending)

echo "Spamming posts to trigger trending..."

create_posts() {
  local TOKEN=$1
  local ID=$2
  local TAG=$3
  for i in {1..5}; do
     curl -s -X POST $API_URL/posts -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
       -d "{\"authorId\":\"$ID\",\"content\":\"This is a post about #${TAG} $i\",\"isHashtagPost\":true}" > /dev/null &
  done
  wait
}

# Generating activity
for i in {1..3}; do
  create_posts $TOKEN_TECH $ID_TECH "ai"
  create_posts $TOKEN_SPORT $ID_SPORT "football"
done

echo "Done. Waiting for background cache refresh..."
