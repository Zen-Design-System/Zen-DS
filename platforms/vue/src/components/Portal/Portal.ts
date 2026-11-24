import { computed, defineComponent, h, inject, provide, Teleport, type ComputedRef, type InjectionKey, type PropType } from "vue";

/*
 * Where overlays (tooltips today; Dialog, Side Panel… with the later waves) are teleported (React: components/Portal).
 * Token modes live on data-* attributes, so an overlay only follows light/dark and the other modes when it is mounted
 * inside the element that carries them. Apps that set the modes on <html> need nothing; apps that set them on an inner
 * element render <ZenPortalProvider :container="el"> with an element inside that scope.
 */
const portalKey: InjectionKey<ComputedRef<HTMLElement | null>> = Symbol("zen-portal");

export const ZenPortalProvider = defineComponent({
  name: "ZenPortalProvider",
  props: {
    /** The element overlays are teleported into (null: document.body). */
    container: { type: Object as PropType<HTMLElement | null>, default: null },
  },
  setup(props, { slots }) {
    provide(portalKey, computed(() => props.container));
    return () => slots.default?.();
  },
});

/** The provided container, else document.body (null during SSR). */
export function usePortalContainer(): ComputedRef<HTMLElement | null> {
  const provided = inject(portalKey, null);
  return computed(() => provided?.value ?? (typeof document === "undefined" ? null : document.body));
}

/** Teleports its content into the Zen portal container. */
export const ZenPortal = defineComponent({
  name: "ZenPortal",
  setup(_props, { slots }) {
    const container = usePortalContainer();
    return () => (container.value ? h(Teleport, { to: container.value }, slots.default?.() ?? []) : null);
  },
});
