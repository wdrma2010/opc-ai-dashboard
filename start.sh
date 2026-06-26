#!/bin/sh

npm run start &

for i in $(seq 1 15); do
  wget -q -O /dev/null http://localhost:8080/ 2>/dev/null && break
  sleep 1
done

ARGS="--no-autoupdate --protocol http2"

if [ "$TUNNEL_FORCE_IP_VERSION" = "6" ]; then
    ARGS="$ARGS --edge-ip-version 6"
fi

if [ ! -z "$TUNNEL_TRANSPORT_PROTOCOL" ]; then
    ARGS="$ARGS --protocol $TUNNEL_TRANSPORT_PROTOCOL"
fi

exec cloudflared tunnel $ARGS run --token "$TUNNEL_TOKEN"
