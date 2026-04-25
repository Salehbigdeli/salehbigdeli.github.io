const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const sitemap = require("@quasibit/eleventy-plugin-sitemap");

/**
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(sitemap, {
    sitemap: {
      hostname: "https://salehbigdeli.github.io",
    },
  });
  eleventyConfig.addCollection("postsSorted", (collectionApi) => {
    const posts = collectionApi.getFilteredByGlob("src/posts/*.md");
    return posts.sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

  eleventyConfig.addFilter("formatPostDate", (value) => {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString("en", { year: "numeric", month: "short" });
  });

  eleventyConfig.addFilter("rfcDate", (value) => {
    if (value === "now" || value === "Now") {
      return new Date().toUTCString();
    }
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    return d.toUTCString();
  });

  eleventyConfig.addNunjucksFilter("uniqueCategories", (posts) => {
    const s = new Set();
    for (const p of posts) {
      if (p.data.category) s.add(p.data.category);
    }
    return Array.from(s).sort();
  });

  eleventyConfig.addNunjucksFilter("uniquePostTags", (posts) => {
    const s = new Set();
    for (const p of posts) {
      for (const t of p.data.postTags || []) s.add(t);
    }
    return Array.from(s).sort();
  });

  eleventyConfig.addNunjucksFilter("withTag", (posts, tag) => {
    return posts.filter((p) => (p.data.postTags || []).includes(tag));
  });

  eleventyConfig.addNunjucksFilter("inCategory", (posts, category) => {
    return posts.filter((p) => p.data.category === category);
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    htmlTemplateEngine: "njk",
  };
};
