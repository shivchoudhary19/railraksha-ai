#!/bin/sh
set -eu
freshclam --stdout
freshclam --daemon --stdout &
exec clamd --config-file=/etc/clamav/clamd.conf
