const { protocol, hostname } = location;
const URL = "shopping";
const PORT = "3569";
const fullURL = `${protocol}//${hostname}:${PORT}/${URL}`;

const getList = async () => {
  const response = await fetch(fullURL, {
    cache: "no-cache",
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  const json = await response.json();

  return json.state as any;
};

export default getList;
