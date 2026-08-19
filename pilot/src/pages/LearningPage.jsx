import ContentPage from '../ContentPage.jsx'
import photo from '../assets/img/learning.webp'
import html from '../content/learning.html?raw'

export default function LearningPage() {
  return <ContentPage photo={photo} photoAlt="יד מגישה חטיף לכלב קשוב באימון על רצפת עץ" html={html} />
}
