import type { Route } from "./+types/home";

import {
  Form as RouterForm,
  ShouldRevalidateFunction,
  type MetaFunction,
} from "react-router";
import { useForm, useField } from "@conform-to/react/future";
import { z } from "zod/v4";

import { Link } from "~/components/link/link";

import * as styles from "./home.css";

import { supabase } from "~/lib/supabase.server";

import { parseSubmission, report } from "@conform-to/react/future";

import { redirectWithSuccess } from "remix-toast";
import { Button } from "~/components/button/button";

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
  const { data: lists, error } = await supabase
    .from("lists")
    .select("id, name, slug")
    .eq("state", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching lists:", error);
    return { dir: [] };
  }

  return {
    dir: lists.map((list) => ({
      file: list.slug,
      list: list.name,
    })),
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

  console.log({ slug });

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

export default function Index({ loaderData }: Route.ComponentProps) {
  const { form, fields } = useForm(zCreate, {
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
  });

  return (
    <div>
      <h1 id="list-label">Lists</h1>
      <nav>
        <ul>
          {loaderData.dir.map(
            ({ list, file }: { list: string; file: string }) => {
              return (
                <li key={file}>
                  {list}

                  <Link to={`/lists/${file}`}>edit</Link>
                </li>
              );
            },
          )}
        </ul>
      </nav>
      <hr />

      <RouterForm method="POST" {...form.props}>
        {/* <Form method="POST" {...form.props} validationErrors={form.fieldErrors}> */}

        <conform-input
          name={fields["new-list"].name}
          id={fields["new-list"].id}
          label="New list"
        />

        <Button type="submit">Create new list</Button>
        {/* </Form> */}
      </RouterForm>
    </div>
  );
}
