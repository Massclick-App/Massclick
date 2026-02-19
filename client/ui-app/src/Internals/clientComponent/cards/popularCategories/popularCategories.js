import React, { useEffect, useState } from "react";
import "./popularCategories.css";
import {  useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Drawer from "@mui/material/Drawer";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";

import Salon from "../../../../assets/features/barbershop.webp";
import Astrologers from "../../../../assets/features/astrologers.webp";
import BodyMassage from "../../../../assets/features/Bodymassage.webp";
import BeautyParlour from "../../../../assets/features/beauty-parlour.webp";
import CarHire from "../../../../assets/features/Carhired.webp";
import Spa from "../../../../assets/features/spa.webp";
import CharteredAccountant from "../../../../assets/features/accountant.webp";
import ComputerTraining from "../../../../assets/features/computer-course.webp";
import CourierServices from "../../../../assets/features/delivery.webp";
import Electricians from "../../../../assets/features/electrician.webp";
import EventOrganiser from "../../../../assets/features/eventorgan.webp";
import RealEstate from "../../../../assets/features/real-estates.webp";
import Fabricators from "../../../../assets/features/fabricator.webp";
import Hobbies from "../../../../assets/features/hobby.webp";
import InternetWeb from "../../../../assets/features/internet-web.webp";
import Jewellery from "../../../../assets/features/jewelry.webp";
import Lawyers from "../../../../assets/features/lawyer.webp";
import NursingServices from "../../../../assets/features/nurse-service.webp";
import Printing from "../../../../assets/features/printer.webp";
import Placement from "../../../../assets/features/hiring.webp";
import ScrapDealers from "../../../../assets/features/scrap.webp";
import Registration from "../../../../assets/features/Registration.webp";
import Coaching from "../../../../assets/features/coaching.webp";
import VocationalTraining from "../../../../assets/features/vocational-training.webp";
import VastuConsultant from "../../../../assets/features/vastu-consultant.webp";
import Numerology from "../../../../assets/features/numerology.webp";
import Geologist from "../../../../assets/features/geologist.webp";
import Textile from "../../../../assets/features/textile.webp";
import PaintingService from "../../../../assets/features/paint-services.webp";
import Opticals from "../../../../assets/features/opticals.webp";
import Tailoring from "../../../../assets/features/tailoring.webp";
import OrganicShop from "../../../../assets/features/organics.webp";
import KidsSchool from "../../../../assets/features/kids-school.webp";

import Physiotherapy from "../../../../assets/features/physiotherapy.webp";
import ClinicalLab from "../../../../assets/features/clinicalLab.webp";
import Architect from "../../../../assets/features/architech.webp";
import Sports from "../../../../assets/features/sports.webp";
import Tiles from "../../../../assets/features/tiles.webp";
import ExportAndImport from "../../../../assets/features/import-export.webp";
import Boutique from "../../../../assets/features/boutique.webp";
import BookShop from "../../../../assets/features/book-shop.webp";
import FancyShop from "../../../../assets/features/fancy-store.webp";
import Tatoos from "../../../../assets/features/tatoo.webp";
import NurseryGarden from "../../../../assets/features/nursery.webp";
import SpecialSchool from "../../../../assets/features/special-school.webp";
import MosquitoNet from "../../../../assets/features/mosquito-net.webp";
import FootwearShop from "../../../../assets/features/footwear-shop.webp";
import HomeoClinic from "../../../../assets/features/homieo.webp";
import HearingAid from "../../../../assets/features/hearing-aid.webp";
import Automobiles from "../../../../assets/features/auto-mobiles.webp";
import Cosmetics from "../../../../assets/features/cosmetics.webp";
import Loans from "../../../../assets/features/Loans.webp";

export const STATIC_CATEGORIES = [
    { icon: Astrologers, label: "Astrologer", path: "/astrologers" },
    { icon: VastuConsultant, label: "Vastu Consultant", path: "/vastu-consultants" },
    { icon: Numerology, label: "Numerology", path: "/numerology" },
    { icon: Geologist, label: "Geologist", path: "/geologist" },

    { icon: CharteredAccountant, label: "Chartered Accountant", path: "/ca" },
    { icon: ComputerTraining, label: "Computer Training Institutes", path: "/computer-training" },
    { icon: Coaching, label: "Coaching", path: "/coaching" },
    { icon: VocationalTraining, label: "Vocational training", path: "/vocational-training" },

    { icon: Lawyers, label: "Lawyer", path: "/lawyers" },
    { icon: Registration, label: "Registration Consultant", path: "/registration-consultants" },
    { icon: Placement, label: "Placement Service", path: "/placement" },
    { icon: KidsSchool, label: "Kids School", path: "/kids-school" },

    { icon: BeautyParlour, label: "Beauty Parlour", path: "/beauty-spa" },
    { icon: BodyMassage, label: "Body Massage", path: "/beauty/spa-massages" },
    { icon: Salon, label: "Salon", path: "/salon" },
    { icon: Spa, label: "Spa", path: "/spa" },

    { icon: CarHire, label: "Car Hire", path: "/car-hire" },
    { icon: Electricians, label: "Electrician", path: "/electricians" },
    { icon: EventOrganiser, label: "Event Organizer", path: "/event-organisers" },
    { icon: RealEstate, label: "Real Estate", path: "/real-estate" },

    { icon: Textile, label: "Textile", path: "/textile" },
    { icon: Fabricators, label: "Fabricators", path: "/fabricators" },
    { icon: Jewellery, label: "Jewellery Showroom", path: "/jewellery" },
    { icon: Tailoring, label: "Tailoring", path: "/tailoring" },

    { icon: PaintingService, label: "Painting Service", path: "/painting-service" },
    { icon: NursingServices, label: "Nursing Service", path: "/nursing-services" },
    { icon: CourierServices, label: "Courier Services", path: "/courier-service" },
    { icon: Printing, label: "Printing & Publishing Service", path: "/printing" },

    { icon: Hobbies, label: "Hobbies", path: "/hobbies" },
    { icon: InternetWeb, label: "Internet Website Designer", path: "/web-designers" },
    { icon: Opticals, label: "Opticals", path: "/opticals" },
    { icon: OrganicShop, label: "Organic Shop", path: "/organic-shop" },

    { icon: ScrapDealers, label: "Scrap Dealer", path: "/scrap-dealers" },
    { icon: Automobiles, label: "Automobiles", path: "/automobiles" },
    { icon: ExportAndImport, label: "Export & Import", path: "/export-import" },
    { icon: Loans, label: "Loans", path: "/loans" },

    { icon: Physiotherapy, label: "Physiotherapy", path: "/physiotherapy" },
    { icon: ClinicalLab, label: "Clinical Lab", path: "/clinical-lab" },
    { icon: HomeoClinic, label: "Homeo Clinic", path: "/homeo-clinic" },
    { icon: Cosmetics, label: "Cosmetics", path: "/cosmetics" },


    { icon: Architect, label: "Architect", path: "/architect" },
    { icon: Sports, label: "Sports", path: "/sports" },
    { icon: Tiles, label: "Ceramic", path: "/ceramic" },
    { icon: BookShop, label: "Book Shop", path: "/book-shop" },

    { icon: FancyShop, label: "Fancy Shop", path: "/fancy-shop" },
    { icon: Tatoos, label: "Tattoo Artist", path: "/tattoo-artists" },
    { icon: Boutique, label: "Boutique", path: "/boutique" },
    { icon: FootwearShop, label: "Footwear Shop", path: "/footwear-shop" },

    { icon: NurseryGarden, label: "Nursery Garden", path: "/nursery-garden" },
    { icon: SpecialSchool, label: "Special School", path: "/special-school" },
    { icon: MosquitoNet, label: "Mosquito Net", path: "/mosquito-net" },
    { icon: HearingAid, label: "Hearing Aid", path: "/hearing-aid" },

];

const PopularCategoriesDrawer = ({ openFromHome = false, onClose }) => {
    const navigate = useNavigate();

    const [drawerOpen, setDrawerOpen] = useState(openFromHome);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (openFromHome) setDrawerOpen(true);
    }, [openFromHome]);

    const slugify = (text) =>
        text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const filtered = STATIC_CATEGORIES.filter((cat) =>
        cat.label.toLowerCase().includes(search.toLowerCase())
    );

const { selectedDistrict } = useSelector(
  (state) => state.locationReducer
);


    return (
        <Drawer
            anchor="right"
            open={drawerOpen}
            onClose={() => {
                setDrawerOpen(false);
                onClose && onClose();
            }}
            PaperProps={{
                sx: { width: "70%", maxWidth: "900px", padding: "20px" }
            }}
        >
            <div className="pc-header">
                <h2>Popular Categories</h2>
                <CloseIcon
                    className="pc-close"
                    onClick={() => {
                        setDrawerOpen(false);
                        onClose && onClose();
                    }}
                />
            </div>

            <div className="pc-search">
                <SearchIcon />
                <input
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="pc-grid">
                {filtered.map((cat) => (
                    <div
                        key={cat.label}
                        className="pc-item"
                        onClick={() => {

                            const districtSlug = slugify(selectedDistrict || "india");

                            const categorySlug = slugify(cat.label);

                            navigate(`/${districtSlug}/${categorySlug}`, {
                                state: {
                                    categoryName: cat.label
                                }
                            });

                            setDrawerOpen(false);

                        }}

                    >
                        <img src={cat.icon} alt={cat.label} className="pc-icon" />
                        <span>{cat.label}</span>
                    </div>
                ))}
            </div>
        </Drawer>
    );
};

export default PopularCategoriesDrawer;
