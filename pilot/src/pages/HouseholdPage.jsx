import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/household.webp'
import html from '../content/household.html?raw'

export default function HouseholdPage() {
  return <ContentPage photo={photo} photoAlt="כלב נח על הרצפה בסלון בזמן שבני הבית בסביבה, כל אחד עסוק בשלו" html={html} />
}
