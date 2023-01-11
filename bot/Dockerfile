FROM public.ecr.aws/bitnami/node:18
RUN apt-get install git
ENV NODE_ENV=production
RUN npm install -g yarn
RUN npm install -g typescript
RUN npm install -g ts-node

WORKDIR /app
COPY . .
RUN rm -r data
RUN rm .env
RUN mkdir "data"
