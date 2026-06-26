# Brain Behaviour Academy — Grade 9 CBSE Study Tracker

A self-contained, client-side study tracker for the Grade 9 CBSE syllabus (Science, Social Science, Maths). No backend required — progress is saved in the browser's `localStorage`.

## Features

- Full chapter → topic → subtopic breakdown for Science, Social Science (Geography, Political Science, Economics, History) and Maths.
- Study / Revise / Test checkboxes per topic, with live progress percentages.
- Student name field, personalized progress heading.
- Star any topic as "Important" and filter the view to show only important topics.
- A graphical Progress Dashboard tab: completion ring chart, Study/Revise/Test bars per subject, important-topic stats, and a "needs attention" chapter list.
- Add, edit (double-click chapter titles / click into topic text), and delete chapters, topics, and subtopics.
- Expand/Collapse All, and a Reset Progress action.

## Project structure

```
index.html        Main page markup
css/styles.css     All styling
js/data.js         Syllabus seed data (chapters/topics/subtopics)
js/app.js          App logic (rendering, state, storage, dashboard)
```

## Hosting on GitHub Pages

1. Push this folder's contents to a GitHub repository (e.g. as the repo root, or under `/docs`).
2. In the repo, go to **Settings → Pages**.
3. Set **Source** to the branch and folder containing `index.html` (e.g. `main` / `/ (root)`, or `main` / `/docs`).
4. Save — GitHub will publish the site at `https://<username>.github.io/<repo>/`.

No build step is required; this is plain HTML/CSS/JS.

## Local preview

Because the page uses `localStorage` and relative asset paths, open it via a local web server rather than double-clicking the file (some browsers block `localStorage` on `file://` URLs). For example:

```
npx serve .
```

then visit the printed `http://localhost:...` URL.
