const { protocol, hostname } = location;
const URL = "shopping";
//TODO - fine for local devving - figure out local docker running...
const PORT = process.env.NODE_ENV === "development" ? ":3569" : "";
const fullURL = `${protocol}//${hostname}${PORT}/${URL}`;

const setList = async (data: string) => {
  const response = await fetch(fullURL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: data
  });
  return response.json();
};

export default setList;
