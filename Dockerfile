# Use the official Node.js 16 image as a parent image
FROM node:16-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install any dependencies
RUN npm install

# Copy the rest of your application's source code from your host to your image filesystem.
COPY . .

# Your application binds to port 8080 so you'll use the EXPOSE instruction to have it mapped by the docker daemon
EXPOSE 8080

# Define the command to run your app using CMD which defines your runtime
CMD [ "node", "index.js" ]