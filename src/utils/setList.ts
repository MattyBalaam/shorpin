const { protocol, hostname } = location;
const URL = "shopping";
const PORT = "3569";
const fullURL = `${protocol}//${hostname}:${PORT}/${URL}`;

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
