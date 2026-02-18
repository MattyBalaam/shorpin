import type { Route } from "./+types/home";

import {
  href,
  Form as RouterForm,
  useNavigation,
  type MetaFunction,
} from "react-router";
import { useForm } from "@conform-to/react/future";
import { z } from "zod/v4";

import { Link } from "~/components/link/link";

import { createSupabaseClient } from "~/lib/supabase.server";

import { parseSubmission, report } from "@conform-to/react/future";

import { redirectWithSuccess } from "remix-toast";
import { slugify, resolveSlug } from "~/lib/slugify";
import { Button } from "~/components/button/button";

import * as styles from "./home.css";
import { use, Suspense } from "react";
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

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  return {
    lists: supabase
      .from("lists")
      .select("id, name, slug")
      .eq("state", "active")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const submission = parseSubmission(formData);

  const result = zCreate.safeParse(submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const listName = result.data["new-list"];
  const baseSlug = slugify(listName);

  if (listName) {
    const headers = new Headers();
    const supabase = createSupabaseClient(request, headers);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: matches } = await supabase
      .from("lists")
      .select("slug")
      .like("slug", `${baseSlug}%`)
      .eq("state", "active");

    const slug = resolveSlug(
      baseSlug,
      matches?.map((m: { slug: string }) => m.slug) ?? [],
    );

    const { error } = await supabase.from("lists").insert({
      name: listName,
      slug,
      user_id: user!.id,
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

type ListItem = { id: string; name: string; slug: string };

function ListsSkeleton() {
  return (
    <ul className={styles.list}>
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonBar} />
        </li>
      ))}
    </ul>
  );
}

function Lists({ listsPromise }: { listsPromise: Promise<ListItem[]> }) {
  const lists = use(listsPromise);

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
                className={styles.itemConfig}
                variant="button"
                to={href("/lists/:list/config", { list: slug })}
              >
                settings
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

  const { state } = useNavigation();

  return (
    <>
      <nav className={styles.listWrapper}>
        <Suspense fallback={<ListsSkeleton />}>
          <Lists listsPromise={loaderData.lists as unknown as Promise<ListItem[]>} />
        </Suspense>
      </nav>
      <hr />

      <Actions>
        <RouterForm method="POST" {...form.props} className={styles.actions}>
          <div className={styles.newList}>
            <label htmlFor={fields["new-list"].id}>New list</label>
            <input
              name={fields["new-list"].name}
              id={fields["new-list"].id}
              autoComplete="off"
            />

            <Button type="submit" isSubmitting={state === "submitting"}>
              Create
            </Button>
          </div>
        </RouterForm>
      </Actions>
    </>
  );
}
