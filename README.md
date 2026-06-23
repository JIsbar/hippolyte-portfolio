# Hippolyte Broch Portfolio

A static, research-oriented portfolio for Hippolyte Broch, a student in market finance and applied mathematics.

The website documents my academic profile, quantitative notebooks, interactive prototypes and future research roadmap. It is designed to support applications to distance master's programs in mathematics while remaining explicit about assumptions, limitations and project maturity.

## Academic and Technical Focus

The portfolio currently explores:

- applied mathematics and numerical methods
- probability and stochastic processes
- Python programming and scientific computing
- derivatives pricing and implied volatility
- Monte Carlo simulation
- econometrics and statistical learning
- quantitative finance and portfolio risk

## Projects

### Project I: SPX Implied Volatility Surface Reconstruction

A Kaggle notebook that reconstructs an SPX implied-volatility surface from listed option quotes.

The workflow includes:

- cleaning and filtering option-chain data
- matching calls and puts by strike and expiry
- estimating forward prices through put-call parity
- selecting out-of-the-money options
- inverting Black-76 prices to obtain implied volatility
- visualizing smiles and the three-dimensional volatility surface

This is presented as a first notebook project rather than a production volatility model. The methodology uses mid prices, a flat interest-rate assumption and simplified liquidity filters.

### Project II: Black-Scholes and Heston Volatility Surfaces

A numerical comparison of constant-volatility Black-Scholes surfaces and stochastic-volatility Heston surfaces.

The notebook implements:

- Black-76 pricing and implied-volatility inversion
- the Heston semi-closed characteristic-function approach
- Heston Monte Carlo simulation with full truncation Euler discretization
- implied-volatility smile comparisons across maturities
- numerical comparison of semi-closed and Monte Carlo estimates
- sensitivity analysis for correlation and volatility of volatility

The parameters are synthetic and chosen for numerical exploration. The project does not claim calibration to live market prices or production-grade accuracy.

### Project III: Interactive G10 FX Multi-Leg Option Pricer

A browser-based educational pricer developed from an initial Python and ipywidgets prototype.

The application allows users to:

- select one of nine G10 currency pairs
- choose a maturity from the available market snapshot
- combine up to five option legs
- construct calls, puts, straddles and strangles
- inspect indicative premium, delta, delta notional and vega
- visualize the structure's profit and loss at expiry

All calculations run locally in the browser. The app uses a static data snapshot and ATM volatility for every strike. It excludes live pricing, discount-factor curves, volatility-smile interpolation and full premium-adjusted FX delta conventions.

## Repository Structure

```text
.
├── index.html
├── style.css
├── script.js
├── fx-pricer.html
├── fx-pricer.css
├── fx-pricer.js
├── fx-market-data.json
├── README.md
└── *.png
```

- `index.html` contains the academic portfolio and project presentations.
- `style.css` contains the portfolio's responsive design.
- `script.js` controls the mobile navigation and footer year.
- `fx-pricer.html` contains the interactive pricing interface.
- `fx-pricer.css` contains the application-specific responsive styling.
- `fx-pricer.js` contains the client-side pricing and P&amp;L engine.
- `fx-market-data.json` contains the static G10 market-data snapshot.
- PNG files contain the notebook figures displayed by Projects I and II.

## Local Preview

Because the FX pricer loads a JSON file, preview the site through a local server rather than opening the HTML file directly:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

The interactive application is available at:

```text
http://localhost:8000/fx-pricer.html
```

## Deploy with GitHub Pages

1. Add all website files to the root of the GitHub repository.
2. Commit and push the files to the `main` branch.
3. Open the repository's `Settings` page.
4. Select `Pages` under `Code and automation`.
5. Under `Build and deployment`, select `Deploy from a branch`.
6. Choose the `main` branch and the `/ (root)` folder.
7. Save the configuration and wait for GitHub Pages to publish the site.

For this repository, the published URL should follow this format:

```text
https://jisbar.github.io/hippolyte-portfolio/
```

## Contact

- GitHub: <https://github.com/jisbar>
- LinkedIn: <https://www.linkedin.com/in/hippolyte-broch>
- Email: <hippolyte.broch@edu.escp.eu>

## Project Status and Integrity

This portfolio distinguishes between completed notebooks, numerical prototypes and projects still in development. Results are not presented as professional research or production analytics. Each project states its assumptions and limitations so that the learning process remains transparent and technically credible.

## Technology and Hosting

The website uses only HTML, CSS and JavaScript. It has no backend, database, paid service or build step and is directly compatible with GitHub Pages.
