FROM  node:14.16.0-alpine3.13



# make the 'app' folder the current working directory
WORKDIR /app/server

# copy both 'package.json' and 'package-lock.json' (if available)
COPY package.json ./

# install project dependencies
RUN npm install

# copy project files and folders to the current working directory (i.e. 'app' folder)
COPY . .

#fix upploads missing file
RUN mkdir uploads
RUN mkdir uploads/profile

RUN ln -s /app/uploads /app/public/uploads

# build app for production with minification

EXPOSE 5000
CMD ["npm", "start"]
