FROM alpine:3.24
RUN apk upgrade --no-cache && apk add --no-cache clamav clamav-daemon clamav-clamdscan \
    && mkdir -p /var/lib/clamav /run/clamav && chown -R clamav:clamav /var/lib/clamav /run/clamav
COPY infra/clamav/clamd.conf /etc/clamav/clamd.conf
COPY --chmod=755 infra/clamav/start.sh /start.sh
USER clamav
CMD ["/start.sh"]
