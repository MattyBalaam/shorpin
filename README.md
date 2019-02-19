look inside dockerrr
docker run --rm -it --entrypoint=/bin/bash shorpin

yarn run doTheDocker
yarn run copyTheDockerToParent

docker-compose -f docker-compose.yml config

docker build -t shorpin .
