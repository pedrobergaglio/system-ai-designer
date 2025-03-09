# System Setup Instructions

## Required Services

1. **System Designer**
    - Start with Docker in Langgraph studio
    - Port: 8123

2. **Web Application**
    - Run: `npm run dev`
    - Port: 3000

3. **LiveKit Server**
    ```bash
    docker run --rm \
      -p 7880:7880 \
      -p 7881:7881 \
      -p 7882:7882 \
      -e LIVEKIT_KEYS="devkey: devsecret" \
      livekit/livekit-server
    ```

4. **Agent Service**
    ```bash
    npx tsx -r dotenv/config scripts/realtime-agent.ts dev
    ```