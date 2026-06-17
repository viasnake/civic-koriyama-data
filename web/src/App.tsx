import { useEffect, useState } from "react";
import { PUBLIC_API_BASE_URL } from "../../src/constants";

type Dataset = {
  id: string;
  name: string;
  category: string;
};

export default function App() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    fetch(`${PUBLIC_API_BASE_URL}/datasets`)
      .then((response) => response.json())
      .then((payload) => setDatasets((payload as { data: Dataset[] }).data))
      .catch(() => setDatasets([]));
  }, []);

  return (
    <main>
      <header>
        <h1>Koriyama Open Data Hub</h1>
        <p>郡山市オープンデータ非公式 Webapi v2</p>
      </header>
      <section>
        <h2>Datasets</h2>
        <ul>
          {datasets.map((dataset) => (
            <li key={dataset.id}>
              <strong>{dataset.name}</strong>
              <span>{dataset.category}</span>
            </li>
          ))}
        </ul>
      </section>
      <footer>
        このサービスは非公式です。正確な内容は郡山市公式ウェブサイトで確認してください。
      </footer>
    </main>
  );
}
