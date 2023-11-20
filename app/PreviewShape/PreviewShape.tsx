/* eslint-disable react-hooks/rules-of-hooks */
import { Editor as MonacoEditor, OnChange } from '@monaco-editor/react'
import {
	BaseBoxShapeUtil,
	DefaultSpinner,
	Editor,
	HTMLContainer,
	Icon,
	TLBaseShape,
	Vec2d,
	stopEventPropagation,
	toDomPrecision,
	useIsDarkMode,
	useIsEditing,
	useToasts,
} from '@tldraw/tldraw'
import { useCallback, useState } from 'react'

export type PreviewShape = TLBaseShape<
	'preview',
	{
		html: string
		source: string
		w: number
		h: number
	}
>

export function ShowResult({
	boxShadow,
	editor,
	html,
	isEditing,
	isShowingEditor,
	shape,
}: {
	boxShadow: string
	editor: Editor
	html: string
	isEditing: boolean
	isShowingEditor: boolean
	shape: PreviewShape
}) {
	const dark = useIsDarkMode()

	const handleOnChange: OnChange = useCallback(
		(value, _event) => {
			editor.updateShape({
				id: shape.id,
				type: shape.type,
				props: {
					html: value,
				},
			})
		},
		[editor, shape.id, shape.type]
	)

	return (
		<>
			{isShowingEditor && (
				<div style={{ width: '2000px', height: '100%' }}>
					<MonacoEditor
						defaultLanguage="html"
						defaultValue={html}
						onChange={handleOnChange}
						theme={dark ? 'vs-dark' : 'vs-light'}
						options={{
							minimap: {
								enabled: false,
							},
							lineNumbers: 'off',
							wordWrap: 'wordWrapColumn',
							wordWrapColumn: 80,
							fontSize: 13,
						}}
					/>
				</div>
			)}
			<iframe
				srcDoc={html}
				width={toDomPrecision(shape.props.w)}
				height={toDomPrecision(shape.props.h)}
				draggable={false}
				style={{
					pointerEvents: isEditing ? 'auto' : 'none',
					boxShadow,
					border: '1px solid var(--color-panel-contrast)',
					borderRadius: 'var(--radius-2)',
				}}
			/>
			)
		</>
	)
}

export class PreviewShapeUtil extends BaseBoxShapeUtil<PreviewShape> {
	static override type = 'preview' as const

	getDefaultProps(): PreviewShape['props'] {
		return {
			html: '',
			source: '',
			w: (960 * 2) / 3,
			h: (540 * 2) / 3,
		}
	}

	override canEdit = () => true
	override isAspectRatioLocked = (_shape: PreviewShape) => false
	override canResize = (_shape: PreviewShape) => true
	override canBind = (_shape: PreviewShape) => false
	override canUnmount = () => false

	override component(shape: PreviewShape) {
		const isEditing = useIsEditing(shape.id)
		const [isShowingEditor, setIsShowingEditor] = useState(false)
		const toast = useToasts()

		const pageRotation = this.editor.getShapePageTransform(shape)!.rotation()
		const boxShadow = getRotatedBoxShadow(pageRotation)

		// Kind of a hack—we're preventing user's from pinching-zooming into the iframe
		const htmlToUse = shape.props.html
			? shape.props.html.replace(
					`</body>`,
					`<script>document.body.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); return }, { passive: false })</script>
</body>`
			  )
			: null

		return (
			<HTMLContainer className="tl-embed-container" id={shape.id}>
				{htmlToUse ? (
					<ShowResult
						boxShadow={boxShadow}
						editor={this.editor}
						html={htmlToUse}
						isEditing={isEditing}
						isShowingEditor={isShowingEditor}
						shape={shape}
					/>
				) : (
					<div
						style={{
							width: '100%',
							height: '100%',
							backgroundColor: 'var(--color-culled)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							boxShadow,
							border: '1px solid var(--color-panel-contrast)',
							borderRadius: 'var(--radius-2)',
						}}
					>
						<DefaultSpinner />
					</div>
				)}
				{htmlToUse && (
					<>
						<button
							style={{
								all: 'unset',
								position: 'absolute',
								top: 0,
								right: -40,
								height: 40,
								width: 40,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								cursor: 'pointer',
								pointerEvents: 'all',
							}}
							onClick={() => {
								if (navigator && navigator.clipboard) {
									navigator.clipboard.writeText(shape.props.html)
									toast.addToast({
										icon: 'code',
										title: 'Copied to clipboard',
									})
								}
							}}
							onPointerDown={stopEventPropagation}
							title="Copy code to clipboard"
						>
							<Icon icon="code" />
						</button>
						<button
							style={{
								all: 'unset',
								position: 'absolute',
								top: 30,
								right: -40,
								height: 40,
								width: 40,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								cursor: 'pointer',
								pointerEvents: 'all',
							}}
							onClick={() => {
								setIsShowingEditor(!isShowingEditor)
							}}
							onPointerDown={stopEventPropagation}
							title="Show code"
						>
							<Icon icon="follow" />
						</button>
					</>
				)}
				{htmlToUse && (
					<div
						style={{
							textAlign: 'center',
							position: 'absolute',
							bottom: isEditing ? -40 : 0,
							padding: 4,
							fontFamily: 'inherit',
							fontSize: 12,
							left: 0,
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							pointerEvents: 'none',
						}}
					>
						<span
							style={{
								background: 'var(--color-panel)',
								padding: '4px 12px',
								borderRadius: 99,
								border: '1px solid var(--color-muted-1)',
							}}
						>
							{isEditing ? 'Click the canvas to exit' : 'Double click to interact'}
						</span>
					</div>
				)}
			</HTMLContainer>
		)
	}

	indicator(shape: PreviewShape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}
}

// todo: export these from tldraw

const ROTATING_BOX_SHADOWS = [
	{
		offsetX: 0,
		offsetY: 2,
		blur: 4,
		spread: -1,
		color: '#0000003a',
	},
	{
		offsetX: 0,
		offsetY: 3,
		blur: 12,
		spread: -2,
		color: '#0000001f',
	},
]

function getRotatedBoxShadow(rotation: number) {
	const cssStrings = ROTATING_BOX_SHADOWS.map((shadow) => {
		const { offsetX, offsetY, blur, spread, color } = shadow
		const vec = new Vec2d(offsetX, offsetY)
		const { x, y } = vec.rot(-rotation)
		return `${x}px ${y}px ${blur}px ${spread}px ${color}`
	})
	return cssStrings.join(', ')
}
