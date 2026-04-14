import {
  createCategory,
  viewCategory,
  viewAllCategory,
  updateCategory,
  deleteCategory,
  businessSearchCategory
} from "../../helper/category/categoryHelper.js";
import { BAD_REQUEST } from "../../errorCodes.js";
import categoryModel from "../../model/category/categoryModel.js";
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

/**
 * VIEW SINGLE CATEGORY
 */
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

/**
 * VIEW ALL CATEGORIES
 */
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

/**
 * UPDATE CATEGORY
 */
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
    console.error(error);
    res.status(400).send({ message: error.message });
  }
};

export const getSubCategoriesAction = async (req, res) => {
  try {
    const { parentId } = req.params;

    const BASE_URL = "https://massclickdev.s3.ap-southeast-2.amazonaws.com/";

    const allowedNames = categoriesData[parentId]?.map(i =>
      i.name.toLowerCase().trim()
    ) || [];

    const data = await categoryModel.find({
      categoryType: "Sub Category",
      isActive: true
    }).lean();

    const filtered = data.filter(item =>
      allowedNames.includes(item.category.toLowerCase().trim())
    );

    if (filtered.length > 0) {
      return res.json(
        filtered.map(item => ({
          _id: item._id,
          name: item.category,
          slug: item.slug,
          icon: item.categoryImageKey
            ? `${BASE_URL}${item.categoryImageKey}`
            : "/icons/default.webp"
        }))
      );
    }

    const fallback = categoriesData[parentId]?.map((item, index) => ({
      _id: index + 1,
      name: item.name,
      slug: item.name.toLowerCase().replace(/\s+/g, "-"),
      icon: "/icons/default.webp"
    })) || [];

    res.json(fallback);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getPopularCategoriesAction = async (req, res) => {
  try {

    const POPULAR_ORDER = [
      "Astrology",
      "Vastu Consultant",
      "Numerology",
      "Geologist",
      "Chartered Accountant",
      "Computer Training Institutes",
      "Coaching",
      "Vocational training",
      "Lawyer",
      "Registration Consultant",
      "Placement Service",
      "Kids School",
      "Beauty Parlour",
      "Body Massage",
      "Salon",
      "Beauty Spa",
      "Car Hire",
      "Electrician Services",
      "Event Organisers",
      "Real Estate",
      "Textile",
      "Fabricators",
      "Jewellery Showroom",
      "Tailoring",
      "Painting Contractor",
      "Nursing Service",
      "Courier Services",
      "Printing & Publishing Service",
      "Hobbies",
      "Internet Website Designer",
      "Opticals",
      "Organic Shop",
      "Scrap Dealer",
      "Automobiles",
      "Export and Import",
      "Loans",
      "Physiotherapy",
      "Clinical Lab",
      "Homeo Clinic",
      "Cosmetics",
      "Architect",
      "Sports",
      "Ceramic",
      "Book Shop",
      "Fancy Shop",
      "Tattoo Artist",
      "Boutique",
      "Footwear Shop",
      "Nursery Garden",
      "Special School",
      "Mosquito Net",
      "Hearing Aid"
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
                section, // ✅ VERY IMPORTANT
                icon: found.categoryImageKey
                  ? `${S3_BASE_URL}${found.categoryImageKey}`
                  : null
              }
            : {
                name,
                slug: name.toLowerCase().replace(/ /g, "-"),
                section, // ✅ VERY IMPORTANT
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