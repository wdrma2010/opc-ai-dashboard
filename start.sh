#!/bin/sh

npm run start &

ARGS="--no-autoupdate"

if [ "$TUNNEL_FORCE_IP_VERSION" = "6" ]; then
    ARGS="$ARGS --edge-ip-version 6"
fi

if [ ! -z "$TUNNEL_TRANSPORT_PROTOCOL" ]; then
    ARGS="$ARGS --protocol $TUNNEL_TRANSPORT_PROTOCOL"
fi

exec cloudflared tunnel $ARGS run --token "$TUNNEL_TOKEN"
