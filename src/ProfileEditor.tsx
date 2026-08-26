import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Camera,
  Check,
  ImagePlus,
  Loader2,
  UserRound,
  X,
} from "lucide-react";

import {
  updateUserProfile,
  type EliseoUser,
} from "./firestore";

import {
  uploadAvatar,
} from "./storage";


type ProfileEditorProps = {
  user: EliseoUser;

  onClose: () => void;

  onSaved: (
    profile:
      EliseoUser
  ) => void;
};


function ProfileEditor({
  user,
  onClose,
  onSaved,
}: ProfileEditorProps) {

  const [
    username,
    setUsername,
  ] =
    useState("");

  const [
    bio,
    setBio,
  ] =
    useState("");

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState("");

  const [
    avatarFile,
    setAvatarFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    avatarPreview,
    setAvatarPreview,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    saved,
    setSaved,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const objectUrlRef =
    useRef<string | null>(
      null
    );


  useEffect(() => {
    setUsername(
      user.username || ""
    );

    setBio(
      user.bio || ""
    );

    setAvatarUrl(
      user.avatar || ""
    );

    setAvatarPreview(
      user.avatar || ""
    );

    setAvatarFile(
      null
    );

    setError("");
    setSaved(false);
  }, [
    user,
  ]);


  useEffect(() => {
    return () => {
      if (
        objectUrlRef.current
      ) {
        URL.revokeObjectURL(
          objectUrlRef.current
        );
      }
    };
  }, []);


  function selectAvatar(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ].includes(file.type)
    ) {
      setError(
        "Use JPG, PNG, WebP ou GIF."
      );

      return;
    }


    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "O avatar pode ter no máximo 5 MB."
      );

      return;
    }


    setError("");

    setAvatarFile(
      file
    );


    if (
      objectUrlRef.current
    ) {
      URL.revokeObjectURL(
        objectUrlRef.current
      );
    }


    const objectUrl =
      URL.createObjectURL(
        file
      );


    objectUrlRef.current =
      objectUrl;


    setAvatarPreview(
      objectUrl
    );
  }


  async function saveProfile() {
    if (saving) {
      return;
    }


    const cleanUsername =
      username
        .trim()
        .toLowerCase();


    if (
      cleanUsername.length <
      3
    ) {
      setError(
        "O username precisa ter pelo menos 3 caracteres."
      );

      return;
    }


    if (
      !/^[a-z0-9._]+$/.test(
        cleanUsername
      )
    ) {
      setError(
        "Use apenas letras, números, ponto e underline."
      );

      return;
    }


    try {
      setSaving(true);
      setSaved(false);
      setError("");


      let finalAvatar =
        avatarUrl;


      if (
        avatarFile
      ) {
        const uploaded =
          await uploadAvatar(
            user.uid,
            avatarFile
          );


        finalAvatar =
          uploaded.url;
      }


      await updateUserProfile(
        user.uid,
        cleanUsername,
        bio,
        finalAvatar
      );


      const updatedProfile:
        EliseoUser = {
        ...user,

        username:
          cleanUsername,

        bio:
          bio.trim(),

        avatar:
          finalAvatar,
      };


      setAvatarUrl(
        finalAvatar
      );

      setAvatarPreview(
        finalAvatar
      );

      setAvatarFile(
        null
      );


      onSaved(
        updatedProfile
      );


      setSaved(true);


      setTimeout(
        () => {
          onClose();
        },
        500
      );
    } catch (
      caughtError
    ) {
      console.error(
        "Erro ao salvar perfil:",
        caughtError
      );


      if (
        caughtError instanceof Error
      ) {
        setError(
          caughtError.message
        );
      } else {
        setError(
          "Não foi possível salvar o perfil."
        );
      }
    } finally {
      setSaving(false);
    }
  }


  const fallback =
    username
      .charAt(0)
      .toUpperCase() ||
    "E";


  return (
    <div
      className="profile-editor-overlay"
      onMouseDown={(
        event
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >

      <div className="profile-editor">

        <header className="profile-editor-header">

          <div>
            <span>
              IDENTIDADE
            </span>

            <h2>
              Editar perfil
            </h2>

            <p>
              Personalize como você aparece no Elíseo.
            </p>
          </div>


          <button
            className="editor-close"
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            <X size={18} />
          </button>

        </header>


        <section className="editor-visual">

          <div className="editor-cover">
            <span>
              ELÍSEO
            </span>
          </div>


          <div className="editor-avatar-row">

            <button
              type="button"
              className="editor-avatar"
              onClick={() =>
                fileInputRef
                  .current
                  ?.click()
              }
              disabled={
                saving
              }
            >

              {avatarPreview ? (
                <img
                  src={
                    avatarPreview
                  }
                  alt="Avatar"
                />
              ) : (
                <span>
                  {fallback}
                </span>
              )}


              <div className="avatar-edit-overlay">
                <Camera
                  size={18}
                />
              </div>

            </button>


            <input
              ref={
                fileInputRef
              }
              className="hidden-file-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={
                selectAvatar
              }
            />


            <div className="avatar-description">

              <strong>
                {username ||
                  "Usuário"}
              </strong>

              <span>
                JPG, PNG, WebP ou GIF · máximo 5 MB
              </span>

            </div>


            <button
              type="button"
              className="change-photo-button"
              onClick={() =>
                fileInputRef
                  .current
                  ?.click()
              }
              disabled={
                saving
              }
            >
              <ImagePlus
                size={15}
              />

              Trocar foto
            </button>

          </div>

        </section>


        <section className="profile-editor-form">

          <div className="editor-field">

            <div className="editor-field-header">
              <label>
                USERNAME
              </label>

              <span>
                {username.length}/30
              </span>
            </div>


            <div className="username-input-wrapper">

              <span>
                @
              </span>

              <input
                value={
                  username
                }
                onChange={(
                  event
                ) =>
                  setUsername(
                    event.target.value
                  )
                }
                maxLength={
                  30
                }
                disabled={
                  saving
                }
              />

            </div>

          </div>


          <div className="editor-field">

            <div className="editor-field-header">
              <label>
                SOBRE VOCÊ
              </label>

              <span>
                {bio.length}/180
              </span>
            </div>


            <textarea
              value={
                bio
              }
              onChange={(
                event
              ) =>
                setBio(
                  event.target.value
                )
              }
              maxLength={
                180
              }
              rows={
                4
              }
              placeholder="Escreva alguma coisa sobre você..."
              disabled={
                saving
              }
            />

          </div>


          <div className="profile-live-preview">

            <span className="profile-preview-label">
              PRÉVIA
            </span>


            <div className="preview-profile-card">

              <div className="preview-avatar">

                {avatarPreview ? (
                  <img
                    src={
                      avatarPreview
                    }
                    alt=""
                  />
                ) : (
                  <UserRound
                    size={18}
                  />
                )}

              </div>


              <div className="preview-profile-text">

                <strong>
                  {username ||
                    "Username"}
                </strong>

                <span>
                  @{username ||
                    "username"}
                </span>

                {bio && (
                  <p>
                    {bio}
                  </p>
                )}

              </div>

            </div>

          </div>


          {error && (
            <div className="profile-editor-error">
              {error}
            </div>
          )}


          <div className="profile-editor-actions">

            <button
              className="editor-cancel-button"
              type="button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
            >
              Cancelar
            </button>


            <button
              className={`profile-editor-save ${
                saved
                  ? "saved"
                  : ""
              }`}
              type="button"
              onClick={
                saveProfile
              }
              disabled={
                saving
              }
            >

              {saving ? (
                <>
                  <Loader2
                    size={14}
                    className="spinner"
                  />

                  Salvando...
                </>
              ) : saved ? (
                <>
                  <Check
                    size={14}
                  />

                  Salvo
                </>
              ) : (
                "Salvar alterações"
              )}

            </button>

          </div>

        </section>

      </div>

    </div>
  );
}


export default ProfileEditor;