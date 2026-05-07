// Next.js 15 changed revalidateTag to require a second `profile` arg in its
// type definition, but route handlers only need the tag. Restore the 1-arg overload.
declare module "next/cache" {
  export function revalidateTag(tag: string): undefined
  export function revalidateTag(tag: string, profile: string | { expire?: number }): undefined
}
