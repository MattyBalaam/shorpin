import type { Route } from "./+types/home";

import {
  href,
  Form as RouterForm,
  ShouldRevalidateFunction,
  type MetaFunction,
} from "react-router";
import { useForm, useField } from "@conform-to/react/future";
import { z } from "zod/v4";

import { Link } from "~/components/link/link";

import { supabase } from "~/lib/supabase.server";

import { parseSubmission, report } from "@conform-to/react/future";

import { redirectWithSuccess } from "remix-toast";
import { slugify } from "~/lib/slugify";
import { Button } from "~/components/button/button";

import * as styles from "./home.css";
import { Suspense, use } from "react";
import { Actions } from "~/components/actions/actions";

export const meta: MetaFunction = () => {
  return [
    { title: "Shorpin" },
    { name: "description", content: "Loadsalists" },
  ];
};

export const handle = {
  breadcrumb: {
    label: "Home",
  },
};

const zCreate = z.object({
  "new-list": z.string().min(1, "List name is required"),
});

async function getLists() {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, slug")
    .eq("state", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  console.log(data);

  return data;
}

export async function loader(_args: Route.LoaderArgs) {
  return {
    lists: getLists(),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();

  const submission = parseSubmission(formData);

  const result = zCreate.safeParse(submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const listName = result.data["new-list"];
  const baseSlug = slugify(listName);

  if (listName) {
    // Find existing slugs that match or have a numeric suffix
    const { data: matches } = await supabase
      .from("lists")
      .select("slug")
      .like("slug", `${baseSlug}%`)
      .eq("state", "active");

    const existingSlugs = new Set(matches?.map((m) => m.slug));
    let slug = baseSlug;

    if (existingSlugs.has(slug)) {
      let suffix = 2;
      while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
        suffix++;
      }
      slug = `${baseSlug}-${suffix}`;
    }

    const { error } = await supabase.from("lists").insert({
      name: listName,
      slug,
    });

    if (error) {
      console.error("Error creating list:", error);
      return report(submission);
    }

    return redirectWithSuccess(
      `/lists/${slug}`,
      `List "${listName}" created successfully!`,
    );
  }

  return report(submission);
}

function Lists({
  data,
}: {
  data: Promise<Array<{ id: string; name: string; slug: string }>>;
}) {
  const lists = use(data);

  return (
    <ul className={styles.list}>
      {lists.map(({ id, name, slug }) => {
        return (
          <li key={id} role="list" className={styles.itemWrapper}>
            <span className={styles.item}>
              <Link
                className={styles.itemLink}
                to={href("/lists/:list", { list: slug })}
              >
                {name}
              </Link>
              <Link
                className={styles.itemDelete}
                variant="button"
                to={href("/lists/:list/confirm-delete", { list: slug })}
              >
                delete
              </Link>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Index({ loaderData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <>
      <nav className={styles.listWrapper}>
        <Suspense
          fallback={<p className={styles.listLoader}>We are loading…</p>}
        >
          <Lists data={loaderData.lists} />
        </Suspense>
      </nav>
      <hr />

      <Actions>
        <RouterForm method="POST" {...form.props} className={styles.actions}>
          {/* <Form method="POST" {...form.props} validationErrors={form.fieldErrors}> */}

          <div className={styles.newList}>
            <label htmlFor={fields["new-list"].id}>New list</label>
            <input name={fields["new-list"].name} id={fields["new-list"].id} />

            <Button type="submit">Create</Button>
          </div>

          {/* </Form> */}
        </RouterForm>
      </Actions>
    </>
  );
}
