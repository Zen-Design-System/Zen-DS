# Zen DS registry image: Verdaccio + the zen-license auth plugin + config.yaml. Build context: tools/registry.
FROM verdaccio/verdaccio:6.10.5

USER root
COPY --chown=10001:65533 plugins/ /verdaccio/plugins/
COPY --chown=10001:65533 config.yaml /verdaccio/conf/config.yaml
USER 10001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4873/-/ping || exit 1
