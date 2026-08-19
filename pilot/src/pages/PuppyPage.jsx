import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/puppy.webp'
import html from '../content/puppy.html?raw'

export default function PuppyPage() {
  return <ContentPage photo={photo} photoAlt="גור בן כעשרה שבועות חוקר את רצפת הסלון באור אחר הצהריים" html={html} />
}
