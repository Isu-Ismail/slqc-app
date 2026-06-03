# Use the official lightweight Nginx image
FROM nginx:alpine

WORKDIR /data

# Create directories
RUN mkdir -p /data/app /data/admin /data/pb_hooks_carrier

# Copy pre-built assets directly from local dist folders
COPY quran-competition-app/dist /data/app
COPY admin-dashboard/dist /data/admin

# NEW: Copy your local hooks into this image as a "carrier"
COPY pocketbase/pb_hooks /data/pb_hooks_carrier

# Copy the Nginx config from the root of your build context
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the ports
EXPOSE 3000 3001