# Estágio de Build
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de Produção
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist /app/dist
COPY package*.json ./
RUN npm install --production serve
CMD ["npm", "start"]

# Exponha a porta que o 'serve' utiliza
EXPOSE 3000