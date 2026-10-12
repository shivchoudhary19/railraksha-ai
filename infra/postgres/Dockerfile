FROM golang:1.27.2-alpine AS gosu
RUN GOBIN=/out CGO_ENABLED=0 go install github.com/tianon/gosu@6456aaa0f3c854d199d0f037f068eb97515b7513

FROM postgres:16.15-alpine
# Rebuild the official privilege helper with patched Go; keep it out of the runtime.
COPY --from=gosu /out/gosu /usr/local/bin/gosu
COPY --chmod=0644 infra/postgres/init.sh /docker-entrypoint-initdb.d/01-init.sh
