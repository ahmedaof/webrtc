FROM  node:14.16.0-alpine3.13



# make the 'app' folder the current working directory
WORKDIR /app

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package.json ./

# install project dependencies
RUN npm install

RUN npm install -g nodemon

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY . .


# build app for production with minification

EXPOSE 3030
EXPOSE 4430
EXPOSE 19302
EXPOSE 8086
EXPOSE 3478
EXPOSE 9443
EXPOSE 8080/udp
EXPOSE 6970-6980
CMD ["npm","run","start"]
