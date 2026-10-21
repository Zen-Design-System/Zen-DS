/** Types for instance-look.mjs (an instance's own opacity and blend on a page made in the Studio). */
export declare const STYLE_ON_ROOT: Set<string>;
export declare const STYLE_ON_ROOT_NOT_INSTANCES: Set<string>;
export declare const INSTANCE_LOOK_PROPS: string[];
export declare function takesInstanceLook(name: string | null | undefined): boolean;
export declare function instanceLookStyle(look?: { opacity?: unknown; blendMode?: unknown }): { opacity?: number; mixBlendMode?: string } | null;
export declare function instanceLookCode(style: Record<string, unknown>): string;
