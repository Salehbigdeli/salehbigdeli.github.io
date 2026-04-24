module.exports = {
  tags: "post",
  layout: "post.njk",
  eleventyComputed: {
    permalink: (data) => `posts/${data.page.fileSlug}/index.html`,
  },
};
