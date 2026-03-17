import * as v from "valibot";

export const zCreate = v.object({
  "new-list": v.pipe(v.string(), v.minLength(1, "List name is required")),
});
