import seoPageContentBlogModel from "../../model/seoModel/seoPageContentBlogModel.js";
import authorMasterModel from "../../model/seoModel/authorMasterModel.js";

const normalizeAuthorName = (name) => {
  if (!name) return null;
  return name.toLowerCase().trim();
};

const getDisplayName = (name) => {
  if (!name) return "Admin";
  const words = name.trim().split(" ");
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

export const normalizeExistingAuthors = async () => {
  try {
    console.log("Starting author normalization...");

    const blogs = await seoPageContentBlogModel.find({ author: { $exists: true, $ne: null } }).select("_id author").lean();

    const uniqueAuthors = new Map();

    blogs.forEach((blog) => {
      if (blog.author) {
        const normalizedName = normalizeAuthorName(blog.author);
        if (!uniqueAuthors.has(normalizedName)) {
          uniqueAuthors.set(normalizedName, {
            name: normalizedName,
            displayName: getDisplayName(blog.author),
            count: 0,
          });
        }
        uniqueAuthors.get(normalizedName).count++;
      }
    });

    console.log(`Found ${uniqueAuthors.size} unique authors`);

    const createdAuthors = new Map();

    for (const [normalizedName, authorData] of uniqueAuthors) {
      try {
        const existingAuthor = await authorMasterModel.findOne({ name: normalizedName });

        if (!existingAuthor) {
          const newAuthor = new authorMasterModel({
            name: authorData.name,
            displayName: authorData.displayName,
            blogCount: authorData.count,
          });

          await newAuthor.save();
          createdAuthors.set(normalizedName, newAuthor._id.toString());
          console.log(`Created author: ${authorData.displayName}`);
        } else {
          createdAuthors.set(normalizedName, existingAuthor._id.toString());
          console.log(`Author already exists: ${authorData.displayName}`);
        }
      } catch (error) {
        console.error(`Error creating author ${authorData.displayName}:`, error.message);
      }
    }

    console.log(`\nUpdating ${blogs.length} blogs with authorId...`);

    for (const blog of blogs) {
      if (blog.author) {
        const normalizedName = normalizeAuthorName(blog.author);
        const authorId = createdAuthors.get(normalizedName);

        if (authorId) {
          await seoPageContentBlogModel.findByIdAndUpdate(blog._id, {
            authorId: authorId,
          });
        }
      }
    }

    console.log("Author normalization completed successfully!");

    return {
      success: true,
      authorsCreated: createdAuthors.size,
      blogsUpdated: blogs.length,
    };
  } catch (error) {
    console.error("Error in author normalization:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const getAuthorWithBlogInfo = async (authorId) => {
  try {
    const author = await authorMasterModel.findById(authorId).lean();

    if (!author) {
      return null;
    }

    const blogCount = await seoPageContentBlogModel.countDocuments({ authorId: authorId.toString() });

    return {
      ...author,
      blogCount,
    };
  } catch (error) {
    console.error("Error fetching author:", error);
    return null;
  }
};

export const updateAuthorBlogCount = async (authorId) => {
  try {
    const count = await seoPageContentBlogModel.countDocuments({
      authorId: authorId.toString(),
    });

    await authorMasterModel.findByIdAndUpdate(authorId, { blogCount: count });

    return count;
  } catch (error) {
    console.error("Error updating blog count:", error);
    return 0;
  }
};
