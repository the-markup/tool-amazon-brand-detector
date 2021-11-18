# Amazon Brand Detector
This repository contains code for our browser extension, Brand Detector. To read more about it, please refer to our post, "[Introducing Amazon Brand Detector]()."

This extension identifies and highlights Amazon brands and exclusive products in orange as your shop online.

## Installation
To install, download via the [Firefox](https://addons.mozilla.org/en-US/firefox/addon/amazon-brands/) or [Chrome ]() extension stores, depending on your browser.

Read more about the [extension](), [methodology](https://themarkup.org/amazons-advantage/2021/10/14/how-we-analyzed-amazons-treatment-of-its-brands-in-search-results) and broader [investigation](https://themarkup.org/amazons-advantage/2021/10/14/amazon-puts-its-own-brands-first-above-better-rated-products) into Amazon brands and exclusives at The Markup.

## Data
`extension/data/asins.yaml` contains ASINs of Amazon devices.<br>
`extension/data/subtitles` contains trademarked brand names that we perform exact text-matching against.<br>
`extension/data/titles` contains disclaimers we perform partial text-matching against.

