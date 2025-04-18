
import PageHeader from "@/components/layout/PageHeader";
import ProfileForm from "@/components/profile/ProfileForm";

const Profile = () => {
  return (
    <div className="pb-20">
      <PageHeader title="Perfil e Configurações" />
      <ProfileForm />
    </div>
  );
};

export default Profile;
