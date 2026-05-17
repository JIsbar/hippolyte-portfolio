# Hippolyte Broch Portfolio

Static GitHub Pages portfolio for Hippolyte Broch, a student in market finance and applied mathematics.

The website presents a serious academic profile and a transparent roadmap of projects in progress. It is designed for applications to distance master's programs in mathematics and avoids claiming completed results.

## Purpose

This portfolio documents technical progression in:

- applied mathematics
- Python programming
- stochastic modeling
- econometrics
- statistical learning
- quantitative finance
- portfolio risk analysis

## Files

- `index.html` contains the full website content.
- `style.css` contains the responsive visual design.
- `script.js` handles the mobile menu and footer year.
- `README.md` explains the project and deployment steps.

## Local preview

Open `index.html` directly in a browser.

You can also run a simple local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deploy with GitHub Pages

1. Create a new repository on GitHub.

   Suggested names:

   - `portfolio`
   - `hippolyte-broch.github.io`

2. Add these files to the repository root:

   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`

3. Commit and push the files to the `main` branch.

4. Open the repository on GitHub.

5. Go to:

   ```text
   Settings > Pages
   ```

6. Under `Build and deployment`, choose:

   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`

7. Click `Save`.

8. Wait a few minutes. GitHub will publish the website.

If the repository is named `portfolio`, the URL will look like:

```text
https://your-username.github.io/portfolio/
```

If the repository is named `your-username.github.io`, the URL will look like:

```text
https://your-username.github.io/
```

## Current contact links

- GitHub: <https://github.com/jisbar>
- LinkedIn: <https://www.linkedin.com/in/hippolyte-broch>
- Email: <hippolyte.broch@edu.escp.eu>

## Future updates

- Add GitHub repository links when projects become publishable.
- Add notebooks and methodological notes for each project.
- Add references for mathematical models and empirical methods.
- Keep project status labels honest as work moves from prototype to completed.

## No paid services

This website uses only HTML, CSS and JavaScript. It has no backend, no database, no paid deployment service and no build step. It is ready for GitHub Pages.
