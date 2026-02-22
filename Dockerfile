###################
# STAGE 1: builder
###################

FROM node:22-bullseye AS builder

ARG MB_EDITION=oss
ARG VERSION

WORKDIR /home/node

RUN apt-get update && apt-get upgrade -y && apt-get install wget apt-transport-https gpg curl git -y \
    && wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor | tee /etc/apt/trusted.gpg.d/adoptium.gpg > /dev/null \
    && echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | tee /etc/apt/sources.list.d/adoptium.list \
    && apt-get update \
    && apt install temurin-21-jdk -y \
    && curl -O https://download.clojure.org/install/linux-install-1.12.0.1488.sh \
    && chmod +x linux-install-1.12.0.1488.sh \
    && ./linux-install-1.12.0.1488.sh

COPY . .

# version is pulled from git, but git doesn't trust the directory due to different owners
RUN git config --global --add safe.directory /home/node

# Use project-local Maven settings if available
RUN if [ -f .m2/settings.xml ]; then \
      mkdir -p ~/.m2 && \
      cp .m2/settings.xml ~/.m2/settings.xml; \
    fi

# install frontend dependencies
RUN yarn --frozen-lockfile

# If VERSION is not provided, use git to get the latest tag or generate a snapshot version
# 添加重试机制以处理网络下载失败（如 opensaml 仓库连接问题）
RUN set -e && \
    if [ -z "$VERSION" ]; then \
      VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0-SNAPSHOT"); \
    fi && \
    MAX_RETRIES=5 && \
    RETRY_COUNT=0 && \
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do \
      echo "开始构建 (尝试 $((RETRY_COUNT + 1))/$MAX_RETRIES)..."; \
      if INTERACTIVE=false CI=true MB_EDITION=$MB_EDITION bin/build.sh :version "\"${VERSION}\""; then \
        echo "构建成功！"; \
        exit 0; \
      fi; \
      RETRY_COUNT=$((RETRY_COUNT + 1)); \
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then \
        echo "构建失败，将在 15 秒后重试 ($RETRY_COUNT/$MAX_RETRIES)..."; \
        sleep 15; \
        echo "清理缓存..."; \
        rm -rf .cpcache ~/.m2/repository/org/opensaml 2>/dev/null || true; \
      else \
        echo "构建失败，已重试 $MAX_RETRIES 次"; \
        exit 1; \
      fi; \
    done

# ###################
# # STAGE 2: runner
# ###################

## Remember that this runner image needs to be the same as bin/docker/Dockerfile with the exception that this one grabs the
## jar from the previous stage rather than the local build

FROM eclipse-temurin:21-jre-alpine AS runner

ENV FC_LANG=en-US LC_CTYPE=en_US.UTF-8

# dependencies
RUN apk add -U bash fontconfig curl font-noto font-noto-arabic font-noto-hebrew font-noto-cjk java-cacerts && \
    apk upgrade && \
    rm -rf /var/cache/apk/* && \
    mkdir -p /app/certs && \
    curl https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem -o /app/certs/rds-combined-ca-bundle.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias aws-rds -file /app/certs/rds-combined-ca-bundle.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    curl https://cacerts.digicert.com/DigiCertGlobalRootG2.crt.pem -o /app/certs/DigiCertGlobalRootG2.crt.pem  && \
    /opt/java/openjdk/bin/keytool -noprompt -import -trustcacerts -alias azure-cert -file /app/certs/DigiCertGlobalRootG2.crt.pem -keystore /etc/ssl/certs/java/cacerts -keypass changeit -storepass changeit && \
    mkdir -p /plugins && chmod a+rwx /plugins

# add Metabase script and uberjar
COPY --from=builder /home/node/target/uberjar/metabase.jar /app/
COPY bin/docker/run_metabase.sh /app/

# expose our default runtime port
EXPOSE 3000

# run it
ENTRYPOINT ["/app/run_metabase.sh"]
