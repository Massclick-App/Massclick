import {
  createCategory,
  viewCategory,
  viewAllCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
  businessSearchCategory
} from "../../helper/category/categoryHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import categoryModel from "../../model/category/categoryModel.js";
import businessListModel from "../../model/businessList/businessListModel.js";
import { uploadImageToS3, getSignedUrlByKey } from "../../s3Uploder.js";
import { categoriesData } from "../../utils/sub-categoriesData.js";

export const addCategoryAction = async (req, res) => {
  try {
    const reqBody = req.body;
    const result = await createCategory(reqBody);
    res.send(result);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await viewCategory(categoryId);
    res.send(category);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const viewAllCategoryAction = async (req, res) => {
  try {
    const pageNo = parseInt(req.query.pageNo) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;

    const search = req.query.search || "";
    const status = req.query.status || "all";
    const sortBy = req.query.sortBy || null;
    const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;

    const { list, total } = await viewAllCategory({
      pageNo,
      pageSize,
      search,
      status,
      sortBy,
      sortOrder
    });

    res.send({
      data: list,
      total,
      pageNo,
      pageSize
    });

  } catch (error) {
    console.error("viewAllCategoryAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const updateCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryData = req.body;
    const category = await updateCategory(categoryId, categoryData);
    res.send(category);
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const deleteCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await deleteCategory(categoryId);
    res.send({ message: "Category deleted successfully", category });
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const categoryBusinessUsageAction = async (req, res) => {
  try {
    const names = [].concat(req.query.names || []).flatMap((n) => n.split(",")).map((n) => n.trim()).filter(Boolean);
    if (!names.length) return res.send([]);

    const counts = await businessListModel.aggregate([
      { $match: { category: { $in: names } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const result = names.map((name) => {
      const found = counts.find((c) => c._id?.toLowerCase() === name.toLowerCase());
      return { name, count: found ? found.count : 0 };
    });

    res.send(result);
  } catch (error) {
    console.error("categoryBusinessUsageAction error:", error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const hardDeleteCategoryAction = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await hardDeleteCategory(categoryId);
    res.send({ message: "Category permanently deleted", category });
  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const businessSearchCategoryAction = async (req, res) => {
  try {
    const query = req.query.query || "";
    const limit = parseInt(req.query.limit) || 20;

    if (!query || query.length < 2) {
      return res.send([]);
    }

    const categories = await businessSearchCategory(query, limit);
    res.send(categories);

  } catch (error) {
    console.error(error);
    return res.status(BAD_REQUEST.code).send({ message: error.message });
  }
};

export const getHomeCategoriesAction = async (req, res) => {
  try {

    const FEATURED_ORDER = [
      "Hotels",
      "Rent And Hire",
      "Restaurants",
      "Education",
      "Hospitals",
      "Dentist",
      "Dermatologist",
      "Sexologist",
      "Contractors",
      "Gym",
      "Furnitures",
      "Florists",
      "Packers and Movers",
      "House Keeping Service",
      "Security System",
      "Wedding Mahal",
      "Photographers",
      "Matrimony",
      "Hostel",
      "Popular Categories",
    ];

    const categories = await categoryModel.find({
      isActive: true
    }).lean();

    const normalize = (name) =>
      name.toLowerCase().replace(/s$/, "").trim();

    const map = new Map(
      categories.map(cat => [
        normalize(cat.category),
        cat
      ])
    );

    const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const ordered = FEATURED_ORDER.map((name) => {

      const found = map.get(normalize(name));

      return found
        ? {
          _id: found._id,
          name: found.category,
          slug: found.slug,
          icon: found.categoryImageKey
            ? `${S3_BASE_URL}${found.categoryImageKey}`
            : null
        }
        : {
          name,
          slug: name.toLowerCase().replace(/ /g, "-"),
          icon: null
        };
    });

    res.send(ordered);

  } catch (error) {
    console.error("getHomeCategoriesAction error:", error);
    res.status(400).send({ message: error.message });
  }
};

export const getMobileHomeCategoriesAction = async (req, res) => {
  try {

    const FEATURED_ORDER = [
      "Hotels",
      "Rent And Hire",
      "Restaurants",
      "Education",
      "Hospitals",
      "Contractors",
      "Gym",
      "Furnitures",
      "House Keeping Service",
      "Security System",
      "Photographers",
      "Popular Categories",
    ];

    const categories = await categoryModel.find({
      isActive: true
    }).lean();

    const normalize = (name) =>
      name.toLowerCase().replace(/s$/, "").trim();

    const map = new Map(
      categories.map(cat => [
        normalize(cat.category),
        cat
      ])
    );

    const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const ordered = FEATURED_ORDER.map((name) => {

      const found = map.get(normalize(name));

      return found
        ? {
          _id: found._id,
          name: found.category,
          slug: found.slug,
          icon: found.categoryImageKey
            ? `${S3_BASE_URL}${found.categoryImageKey}`
            : null
        }
        : {
          name,
          slug: name.toLowerCase().replace(/ /g, "-"),
          icon: null
        };
    });

    res.send(ordered);

  } catch (error) {
    console.error("getHomeCategoriesAction error:", error);
    res.status(400).send({ message: error.message });
  }
};

export const getSubCategoriesAction = async (req, res) => {
  try {
    const { parentId } = req.params;

    const BASE_URL =
      "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const normalize = (text = "") =>
      text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const cleanText = (text = "") =>
      text
        .toLowerCase()
        .trim()
        .replace(/[-_\s]+/g, " ")
        .replace(/\bcontractors\b/g, "contractor")
        .replace(/\s+/g, " ");

    const matchedKey = Object.keys(categoriesData).find((key) => {
      const current = normalize(key);
      const incoming = normalize(parentId);

      return (
        current === incoming ||
        current === incoming + "s" ||
        current + "s" === incoming
      );
    });

    const selectedCategories = matchedKey
      ? categoriesData[matchedKey]
      : [];

    const allowedNames = selectedCategories.map((i) =>
      cleanText(i.name)
    );

    const data = await categoryModel.find({
      isActive: true,
    }).lean();

    const filtered = data.filter((item) =>
      allowedNames.includes(cleanText(item.category))
    );

    const uniqueMap = new Map();

    filtered.forEach((item) => {
      const key = cleanText(item.category);

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const uniqueData = [...uniqueMap.values()].sort((a, b) =>
      a.category.localeCompare(b.category)
    );

    if (uniqueData.length > 0) {
      return res.json(
        uniqueData.map((item) => ({
          _id: item._id,
          name: item.category,
          slug: item.slug,
          icon: item.categoryImageKey
            ? `${BASE_URL}${item.categoryImageKey}`
            : "/icons/default.webp",
        }))
      );
    }

    const fallback = selectedCategories
      .map((item, index) => ({
        _id: index + 1,
        name: item.name,
        slug: item.name.toLowerCase().replace(/\s+/g, "-"),
        icon: "/icons/default.webp",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.json(fallback);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const getPopularCategoriesAction = async (req, res) => {
  try {

    const POPULAR_ORDER = [
      "Architect",
      "Astrology",
      "Automobiles",
      "Beauty Parlour",
      "Beauty Spa",
      "Body Massage",
      "Book Shop",
      "Boutique",
      "Car Hire",
      "Ceramic",
      "Chartered Accountant",
      "Clinical Lab",
      "Coaching",
      "Computer Training Institutes",
      "Cosmetics",
      "Courier Services",
      "Electrician Services",
      "Event Organisers",
      "Export & Import",
      "Fabricators",
      "Fancy Shop",
      "Footwear Shop",
      "Geologist",
      "Hearing Aid",
      "Hobbies",
      "Homeo Clinic",
      "Internet Website Designer",
      "Jewellery Showroom",
      "Kids School",
      "Lawyer",
      "Loans",
      "Mosquito Net",
      "Numerology",
      "Nursery Garden",
      "Nursing Service",
      "Opticals",
      "Organic Shop",
      "Painting Contractor",
      "Physiotherapy",
      "Placement Service",
      "printing & publishing service",
      "Real Estate",
      "Registration Consultant",
      "Salon",
      "Scrap Dealer",
      "Special School",
      "Sports",
      "Tailoring",
      "Tattoo Artist",
      "Textile",
      "Vastu Consultant",
      "Vocational training",
    ];

    const categories = await categoryModel.find({
      isActive: true
    }).lean();

    const normalize = (name) =>
      name.toLowerCase().replace(/s$/, "").trim();

    const map = new Map(
      categories.map(cat => [
        normalize(cat.category),
        cat
      ])
    );

    const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const ordered = POPULAR_ORDER.map((name) => {

      const found = map.get(normalize(name));

      return found
        ? {
          _id: found._id,
          name: found.category,
          slug: found.slug,
          icon: found.categoryImageKey
            ? `${S3_BASE_URL}${found.categoryImageKey}`
            : null
        }
        : {
          name,
          slug: name.toLowerCase().replace(/ /g, "-"),
          icon: null
        };
    });

    res.send(ordered);

  } catch (error) {
    console.error(error);
    res.status(400).send({ message: error.message });
  }
};

export const getServiceCardsAction = async (req, res) => {
  try {

    const SERVICE_SECTIONS = [
      {
        section: "Repair and Services",
        items: ["Car Service", "TV Service", "Bike Service"]
      },
      {
        section: "Services",
        items: [
          "Pest Control Service",
          "AC Service",
          "Computer And Laptop Service"
        ]
      },
      {
        section: "Hot Categories",
        items: [
          "Catering Services",
          "Transporters",
          "Driving School"
        ]
      },
      {
        section: "Building Materials",
        items: [
          "Fencing",
          "Interlock Bricks",
          "Steel Dealers"
        ]
      }
    ];

    const categories = await categoryModel.find({
      isActive: true
    }).lean();

    const normalize = (name) =>
      name.toLowerCase().replace(/s$/, "").trim();

    const map = new Map(
      categories.map(cat => [
        normalize(cat.category),
        cat
      ])
    );

    const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const result = [];

    SERVICE_SECTIONS.forEach(({ section, items }) => {

      items.forEach((name) => {

        const found = map.get(normalize(name));

        result.push(
          found
            ? {
              _id: found._id,
              name: found.category,
              slug: found.slug,
              section, 
              icon: found.categoryImageKey
                ? `${S3_BASE_URL}${found.categoryImageKey}`
                : null
            }
            : {
              name,
              slug: name.toLowerCase().replace(/ /g, "-"),
              section, 
              icon: null
            }
        );

      });

    });

    res.send(result);

  } catch (error) {
    console.error(error);
    res.status(400).send({ message: error.message });
  }
};

export const getAllUniqueCategoriesAction = async (req, res) => {
  try {
    const S3_BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const categories = await categoryModel.find({ isActive: true }).lean();

    const normalize = (text = "") =>
      text.toLowerCase().trim().replace(/[-_\s]+/g, " ");

    const cleanText = (text = "") =>
      text
        .toLowerCase()
        .trim()
        .replace(/[-_\s]+/g, " ")
        .replace(/\bcontractors\b/g, "contractor")
        .replace(/\s+/g, " ");

    const uniqueMap = new Map();
    categories.forEach((item) => {
      const key = normalize(item.category);
      if (!uniqueMap.has(key)) uniqueMap.set(key, item);
    });

    const dbMap = new Map(
      categories.map((cat) => [cleanText(cat.category), cat])
    );

    const result = [...uniqueMap.values()]
      .sort((a, b) => a.category.localeCompare(b.category))
      .map((item) => {
        const parentKey = normalize(item.category);

        const matchedKey = Object.keys(categoriesData).find((key) => {
          const cur = normalize(key);
          return (
            cur === parentKey ||
            cur === parentKey + "s" ||
            cur + "s" === parentKey
          );
        });

        const subNames = matchedKey ? categoriesData[matchedKey] : [];

        const subs = subNames
          .map(({ name }) => {
            const found = dbMap.get(cleanText(name));
            return found
              ? {
                  _id: found._id,
                  name: found.category,
                  slug: found.slug,
                  icon: found.categoryImageKey
                    ? `${S3_BASE_URL}${found.categoryImageKey}`
                    : "/icons/default.webp",
                }
              : {
                  name,
                  slug: name.toLowerCase().replace(/\s+/g, "-"),
                  icon: "/icons/default.webp",
                };
          })
          .sort((a, b) => a.name.localeCompare(b.name));

        return {
          _id: item._id,
          name: item.category,
          slug: item.slug,
          icon: item.categoryImageKey
            ? `${S3_BASE_URL}${item.categoryImageKey}`
            : "/icons/default.webp",
          subs,
        };
      });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};