# תבניות פרומפטים

החלף את מה שבסוגריים מרובעים. תאר אנשים לפי **מיקום + צבע בגד** – זה מה שהכלים מבינים הכי טוב. כל פרומפט באנגלית, בתוך בלוק קוד.

## A – רפרנס דובר / תקריב (צ'אט תמונות)
מעלים: 1. פריים הסצנה  2. תמונת פנים של הדמות החדשה
```
Edit image 1. Replace the face of the [soldier / man / woman] with the person from image 2, so they are clearly recognizable.
Keep exactly the same pose, head angle, mouth shape, clothes, hat, framing and background.
Match the old film look: faded warm colors and film grain. Do not change anything else.
```

## B – רפרנס קבוצה (צ'אט תמונות)
מעלים: 1. פריים  2..N תמונות פנים לפי הסדר שבפרומפט
```
Edit image 1. Replace the faces of the [N] people in the front row:
- The person in the [RED shirt] ([right side]) → the person from image 2.
- The person in the [BLACK-AND-WHITE striped shirt] ([middle]) → the person from image 3[, with beard and kippah].
- The person in the [LIGHT-BLUE striped shirt] ([left side]) → the person from image 4[, with her face and hairstyle].
Each one must be clearly recognizable.
Keep exactly the same poses, head angles, where they look, clothes and positions.
Do not change anyone else or the background. Match the old film look: faded warm colors and film grain.
```

## B2 – סצנה חדשה עם דמויות שכבר יצרנו (צ'אט תמונות)
מעלים: 1. פריים הסצנה  2. רפרנס הדובר שיצרנו  3. רפרנס הקבוצה שיצרנו
```
Edit image 1. Change ONLY the faces so they look exactly like the same people in images 2 and 3:
the [soldier on the left] → the man in image 2;
the person in the [LIGHT-BLUE striped shirt] → the person in the [light-blue striped shirt] in image 3;
the person in the [BLACK-AND-WHITE striped shirt] → the person in the [black-and-white striped shirt] in image 3.
Keep everyone's pose and position from image 1. Change nothing else. Old film look.
```

## C – תיקון פרצוף אחד
מעלים: 1. התמונה שיצאה  2. הרפרנס
```
Edit image 1. Change ONLY the person in the [COLOR] shirt so they look exactly like the person in the [COLOR] shirt in image 2[, with …]. Change nothing else. Old film look.
```

## V – סרטון: העתקת תנועה (Wan / Motion Control)
מעלים: תמונה = `סצנה_N_מוכן.png`, סרטון ייחוס = `סצנה_N_סרטון.mp4`
```
Animate the people in the image so they perform EXACTLY the same actions as the people in the reference video:
same body movements, head turns, gestures, facial expressions and lip movements, at the same timing.
Each person copies the person standing in the same position in the reference video.
[One sentence describing this scene's main action, e.g.: The sergeant lifts his chin, then laughs with his mouth wide open.]
Keep every face, body, outfit and the background exactly as in the image. Do not add or remove people.
Same camera movement as the reference video. Old 1970s film look, faded warm colors, film grain.
```
שלילי (אם יש שדה):
```
face morphing, faces changing, mixed faces, new people, extra limbs, distorted hands, modern clothes, text, watermark
```
טיפ: לבחור את האורך הכי קצר שהכלי מציע – פחות זמן לפנים "להתפרק".

## D – סצנה חדשה בלי סרטון ייחוס (תמונה לסרטון)
```
[Who is where]. [Action 1], then [action 2]. Keep all faces exactly the same as in the image. Static camera.
Old 1970s film look, faded warm colors, film grain. 5 seconds.
```

## E – מעבר מצלמה (תמונת התחלה + תמונת סיום)
מעלים: Start = רפרנס הדובר, End = רפרנס הקבוצה
```
The [sergeant] [shouts proudly] at someone off-screen.
Then the camera makes a fast whip-pan to the right, with motion blur, and lands on [the three recruits].
They stare at the camera in shock, then slowly look at each other.
Keep all faces exactly the same as in the images. Old 1970s film look, film grain. 5 seconds.
```
אם אין בכלי תמונת סיום: שני קטעים נפרדים + מעבר Whip Pan ב-CapCut.
