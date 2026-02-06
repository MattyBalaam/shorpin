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
import { Button } from "~/components/button/button";

import * as styles from "./home.css";
import { Suspense, use } from "react";

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

export async function loader(args: Route.LoaderArgs) {
  return {
    lists: supabase
      .from("lists")
      .select("id, name, slug")
      .eq("state", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
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
  const slug = listName.normalize("NFD");

  if (listName) {
    const { data: existing } = await supabase
      .from("lists")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!existing) {
      const { error } = await supabase.from("lists").insert({
        name: listName,
        slug,
      });

      if (error) {
        console.error("Error creating list:", error);
        return report(submission);
      }
    }
  }

  return redirectWithSuccess(
    `/lists/${slug}`,
    `List "${listName}" created successfully!`,
  );
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
          <li key={id} role="list" className={styles.item}>
            <Link to={href("/lists/:list", { list: slug })}>{name}</Link>{" "}
            <Link to={href("/lists/:list/confirm-delete", { list: slug })}>
              delete
            </Link>
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
      <nav>
        <Suspense fallback={<p>We are loading…</p>}>
          <Lists data={loaderData.lists} />
        </Suspense>
      </nav>
      <hr />

      <RouterForm method="POST" {...form.props}>
        {/* <Form method="POST" {...form.props} validationErrors={form.fieldErrors}> */}

        <div className={styles.newList}>
          <div>
            <label htmlFor={fields["new-list"].id}>New list</label>
            <input name={fields["new-list"].name} id={fields["new-list"].id} />
          </div>

          <Button type="submit">Create new list</Button>
        </div>

        {/* </Form> */}
      </RouterForm>
    </>
  );
}
