// import React from "react";
// import { Link } from "react-router-dom";
// import { Grid, Box, Typography, Card, CardContent } from "@mui/material";
// import TvService from "../../assets/services/tvService.png";
// import PestService from "../../assets/services/pestService.png";
// import CarMechanic from "../../assets/services/carService.png";
// import Parlours from "../../assets/services/parlours.png";
// import Spa from "../../assets/services/spa.png";
// import Salons from "../../assets/services/salons.png";
// import Fencing from "../../assets/services/fencing.jpg";
// import Interlock from "../../assets/services/interlockBricks.png";
// import SteelDealers from "../../assets/services/steelDealers.png";
// import JPromoters from "../../assets/services/JPromoters.png";
// import SkRealEstate from "../../assets/services/SkRealEstate.png";
// import SjPromters from "../../assets/services/SjPromoters.png";
// import CarServiceCards from "./ServiceCards/carService/carService";
// import TvServiceCards from "./ServiceCards/tvService/tvService";
// import PestControlCards from "./ServiceCards/pestControl/pestControlService";
// import BeautyParloursCards from "./ServiceCards/beautyParlours/beautyParlours";
// import SpaAndMassageCards from "./ServiceCards/spaAndMassage/spaAndMassage";
// import SalonsCards from "./ServiceCards/salons/salons";
// import FencingCards from "./ServiceCards/fencing/fencing";
// import InterlockBricksCards from "./ServiceCards/interlockBricks/interlockBricks";
// import SteelDealersCards from "./ServiceCards/steelDealers/steelDealers";
// import RealEstateCards from "./ServiceCards/realEstate/realEstate";
// import './serviceCard.css'

// export const categoriesServices = [
//   {
//     title: "Repair and Services",
//     items: [
//       { name: "Car Service", icon: CarMechanic, path: "/services/car-service", component: CarServiceCards }, 
//       { name: "TV Service", icon: TvService, path: "/services/tv-service", component: TvServiceCards},
//       { name: "Pest Control Service", icon: PestService, path: "/services/pest-control-service", component: PestControlCards },
//     ],
//   },
//   {
//     title: "Beauty and Spa",
//     items: [
//       { name: "Beauty Parlours", icon: Parlours, path: "/beauty/parlours", component: BeautyParloursCards  },
//       { name: "Spa and Massages", icon: Spa, path: "/beauty/spa-massages" , component: SpaAndMassageCards },
//       { name: "Salons", icon: Salons, path: "/beauty/salons",component: SalonsCards  },
//     ],
//   },
//   {
//     title: "Building Materials",
//     items: [
//       { name: "Fencing", icon: Fencing, path: "/materials/fencing",component: FencingCards  },
//       { name: "Interlock Bricks", icon: Interlock, path: "/materials/interlock-bricks",component: InterlockBricksCards },
//       { name: "Steel Dealer", icon: SteelDealers, path: "/materials/steel-dealer",component: SteelDealersCards},
//     ],
//   },
//   {
//     title: "Real Estate",
//     items: [
//       { name: "J Promoters", icon: JPromoters, path: "/real-estate/j-promoters",component: RealEstateCards },
//       { name: "SK Real Estate", icon: SkRealEstate, path: "/real-estate/sk-real-estate",component: RealEstateCards },
//       { name: "SJ Promoters", icon: SjPromters, path: "/real-estate/sj-promoters" ,component: RealEstateCards},
//     ],
//   },
// ];

// const ServiceCardsGrid = () => {
//   return (
//     <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, bgcolor: "#f5f5f5" }}>
//       <Grid container spacing={{ xs: 3, md: 6 }} justifyContent="center">
//         {categoriesServices.map((category, index) => (
//           <Grid
//             item
//             xs={12}
//             sm={6}
//             md={4}
//             key={index}
//             sx={{
//               display: 'flex',
//               maxWidth: { lg: '345px' },
//               height: '100%',
//               justifyContent: 'center'
//             }}
//           >
//             <Card
//               sx={{
//                 width: "100%",
//                 height: "100%",
//                 transition: "transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out",
//                 "&:hover": {
//                   transform: "translateY(-5px)",
//                   boxShadow: "0 10px 20px rgba(0, 0, 0, 0.15)",
//                 },
//                 borderRadius: 3,
//                 boxShadow: 3,
//                 display: 'flex',
//                 flexDirection: 'column',
//                 justifyContent: 'space-between',
//               }}
//               role="region"
//               aria-labelledby={`card-title-${index}`}
//             >
//               <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }}>
//                 <Typography
//                   variant="h5"
//                   component="h2"
//                   id={`card-title-${index}`}
//                   sx={{
//                     fontWeight: "bold",
//                     color: "#f97316",
//                     mb: 2,
//                     textAlign: "center",
//                     fontFamily: "Poppins, sans-serif",
//                   }}
//                 >
//                   {category.title}
//                 </Typography>
//                 <Grid container spacing={2} justifyContent="space-around" sx={{ flexGrow: 1, alignItems: 'center' }}>
//                   {category.items.map((item, idx) => (
//                     <Grid item xs={12} sm={4} key={idx}>
//                       <Box
//                         component={Link} 
//                         to={item.path}  // ✅ use only the correct path
//                         sx={{
//                           width: '100%',
//                           height: '100%',
//                           border: "none",
//                           background: "transparent",
//                           cursor: "pointer",
//                           display: "flex",
//                           flexDirection: "column",
//                           alignItems: "center",
//                           p: 1,
//                           textDecoration: 'none', 
//                           color: 'inherit', 
//                           transition: "transform 0.2s",
//                           "&:hover": {
//                             transform: "scale(1.05)",
//                           },
//                         }}
//                         aria-label={`Explore ${item.name}`}
//                       >
//                         <Box
//                           component="img"
//                           src={item.icon}
//                           alt={item.name}
//                           loading="lazy"
//                           sx={{
//                             width: { xs: 80, sm: 100, md: 100 },
//                             height: { xs: 80, sm: 100, md: 100 },
//                             borderRadius: 2,
//                             objectFit: "cover",
//                             mb: 1,
//                           }}
//                         />
//                         <Typography
//                           variant="body1"
//                           sx={{
//                             textAlign: "center",
//                             fontWeight: 500,
//                             color: "#333",
//                             fontFamily: "Roboto, sans-serif",
//                             minHeight: '40px',
//                             lineHeight: 1.2,
//                           }}
//                         >
//                           {item.name}
//                         </Typography>
//                       </Box>
//                     </Grid>
//                   ))}
//                 </Grid>
//               </CardContent>
//             </Card>
//           </Grid>
//         ))}
//       </Grid>
//     </Box>
//   );
// };

// export default ServiceCardsGrid;
