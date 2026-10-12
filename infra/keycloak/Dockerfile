FROM quay.io/keycloak/keycloak:26.8.0 AS distribution
FROM eclipse-temurin:21.0.12.1_1-jdk-alpine-3.24
ENV KC_RUN_IN_CONTAINER=true KC_HTTP_HOST=0.0.0.0
# Keep the official distribution on supported Java 21 without the affected UBI PCRE packages.
RUN apk upgrade --no-cache && apk add --no-cache bash \
    && addgroup -g 1000 keycloak && adduser -D -u 1000 -G keycloak keycloak
COPY --from=distribution --chown=keycloak:keycloak /opt/keycloak /opt/keycloak
COPY --chown=keycloak:keycloak infra/keycloak/themes /opt/keycloak/themes
USER keycloak
WORKDIR /opt/keycloak
EXPOSE 8080 8443 9000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
