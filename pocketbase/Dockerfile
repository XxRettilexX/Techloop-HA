FROM alpine:3.19

# Install PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v0.22.0/pocketbase_0.22.0_linux_amd64.zip /tmp/pb.zip
RUN apk add --no-cache unzip ca-certificates && \
    unzip /tmp/pb.zip -d /pb && \
    chmod +x /pb/pocketbase && \
    rm /tmp/pb.zip

# Expose port
EXPOSE 8090

# Set working directory
WORKDIR /pb

# Run PocketBase
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
